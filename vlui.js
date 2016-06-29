;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // other libraries
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    defaultTimeFn: 'year',
    typeNames: {
      nominal: 'text',
      ordinal: 'text-ordinal',
      quantitative: 'number',
      temporal: 'time',
      geographic: 'geo'
    }
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button on-close=\"logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.length }})</h2><a ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.length > 0\" class=\"hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in Bookmarks.dict | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\"></vl-plot-group></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || fieldDef.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeNames[fieldDef.type]}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ fieldDef.field | underscore2space }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\'\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo\"><i ng-if=\"fieldDef.aggregate !== \'count\' && containsType([vlType.NOMINAL, vlType.ORDINAL], fieldDef.type)\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.TEMPORAL\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.QUANTITATIVE\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i><i ng-if=\"fieldDef.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet\" field-def=\"fieldDef\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field] }\" ng-mouseover=\"(highlighted||{})[fieldDef.field] = true\" ng-mouseout=\"(highlighted||{})[fieldDef.field] = false\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showMark\" class=\"command disabled\"><i class=\"fa fa-font\"></i> <i class=\"fa fa-line-chart\"></i> <i class=\"fa fa-area-chart\"></i> <i class=\"fa fa-bar-chart\"></i> <i class=\"fa fa-circle-o\"></i></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && chart.vlSpec.cfg.filterNull.O}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" ng-click=\"Bookmarks.toggle(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a></div></div><vl-plot class=\"flex-grow-1\" data-fieldset=\"{fieldSet.key}}\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot></div>");
$templateCache.put("vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vls</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"shCopied=\'(Copied)\'\" zeroclip-model=\"chart.shorthand\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'VL shorthand\', chart.shorthand); shCopied=\'(Logged)\';\">Log</a> <span>{{shCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', 'Logger', function (Bookmarks, consts, Logger) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        // The bookmark list is designed to render within a modal overlay.
        // Because modal contents are hidden via ng-if, if this link function is
        // executing it is because the directive is being shown. Log the event:
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
        scope.logBookmarksClosed = function() {
          Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
        };

        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = Object.keys(this.dict).length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.dict);
    };

    proto.load = function() {
      this.dict = localStorageService.get('bookmarks') || {};
      this.updateLength();
    };

    proto.clear = function() {
      this.dict = {};
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {
      var shorthand = chart.shorthand;

      if (this.dict[shorthand]) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      chart.stats = Dataset.stats;

      this.dict[shorthand] = _.cloneDeep(chart);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      delete this.dict[shorthand];
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.isBookmarked = function(shorthand) {
      return shorthand in this.dict;
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', function() {
    var Config = {};

    Config.data = {};
    Config.config = {};

    Config.getConfig = function() {
      return {};
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        cell: {
          width: 400,
          height: 400
        },
        facet: {
          cell: {
            width: 200,
            height: 200
          }
        }
      };
    };

    Config.small = function() {
      return {
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        }
      };
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['Dataset', 'Drop', 'vl', 'consts', '_', function (Dataset, Drop, vl, consts, _) {
    return {
      templateUrl: 'fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '=',
        showType: '=',
        showInfo: '=',
        showCaret: '=',
        popupContent: '=',
        showRemove: '=',
        removeAction: '&',
        action: '&',
        disableCountCaret: '='
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;
        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.fieldDef.field];
        scope.containsType = function(types, type) {
          return _.includes(types, type);
        };

        switch(scope.fieldDef.type){
          case vl.type.ORDINAL:
            scope.icon = 'fa-font';
            break;
          case vl.type.NOMINAL:
            scope.icon = 'fa-font';
            break;
          case vl.type.QUANTITATIVE:
            scope.icon = 'icon-hash';
            break;
          case vl.type.TEMPORAL:
            scope.icon = 'fa-calendar';
            break;
        }

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(fieldDef) {
          return fieldDef.aggregate || fieldDef.timeUnit ||
            (fieldDef.bin && 'bin') ||
            fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto');
        };

        scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        scope.$on('$destroy', function() {
          if (funcsPopup) {
            funcsPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.where(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.where(Dataset.datasets, {
          group: 'sample'
        });

        scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, fieldDef) {
    m[fieldDef.field] = fieldDef;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'dl', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, dl, vl, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrderBy.cardinality = function(fieldDef, stats) {
      return stats[fieldDef.field].distinct;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    Dataset.getSchema = function(data, stats, order) {
      var types = dl.type.inferAll(data),
        schema = _.reduce(types, function(s, type, field) {
          var fieldDef = {
            field: field,
            type: vl.data.types[type],
            primitiveType: type
          };

          if (fieldDef.type === vl.type.QUANTITATIVE && stats[fieldDef.field].distinct <= 5) {
            fieldDef.type = vl.type.ORDINAL;
          }

          s.push(fieldDef);
          return s;
        }, []);

      schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      schema.push(vl.fieldDef.count());
      return schema;
    };

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          Dataset.updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = dl.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          Dataset.updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    Dataset.updateFromData = function(dataset, data) {
      Dataset.data = data;

      Dataset.currentDataset = dataset;
      Dataset.stats = dl.summary(data).reduce(function(s, profile) {
        s[profile.field] = profile;
        return s;
      }, {
        '*': {
          max: data.length,
          min: 0
        }
      });

      for (var fieldName in Dataset.stats) {
        if (fieldName !== '*') {
          Dataset.stats[fieldName].sample = _.sample(_.map(Dataset.data, fieldName), 7);
        }
      }

      Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
      Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'dl', function (Dataset, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = dl.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', 'consts', 'Analytics', function ($location, $window, consts, Analytics) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},

      //POLESTAR
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.DEBUG},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.DEBUG},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.DEBUG}
    };

    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels.INFO.rank) {
        Analytics.trackEvent(action.category, action.id, label, value);
        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '=',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        'closeCallback': '&onClose'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeCallback) {
            scope.closeCallback();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', function() {
    var Schema = {};

    Schema.schema = dl.json('bower_components/vega-lite/vega-lite-schema.json');

    Schema.getChannelSchema = function(channel) {
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      var ref = encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref;
      var def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['dl', 'vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(dl, vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return b.priority - a.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight:'=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        scope.visId = (counter++);
        scope.hoverPromise = null;
        scope.tooltipPromise = null;
        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;

        var format = dl.format.number('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, '', scope.chart.vlSpec);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, '', scope.chart.vlSpec);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) { return; }

          scope.tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) return;

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);


            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .toPairs().value()
              .map(function(p) {
                p[1] = dl.isNumber(p[1]) ? format(p[1]) : p[1];
                return p;
              });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(scope.tooltipPromise);
          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum);
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) return;

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          dl.extend(vlSpec.config, Config[configSet]());

          // use chart stats if available (for example from bookmarks)
          var stats = scope.chart.stats || Dataset.stats;

          // Special Rules
          var encoding = vlSpec.encoding;
          if (encoding) {
            // put x-axis on top if too high-cardinality
            if (encoding.y && encoding.y.field && [vl.type.NOMINAL, vl.type.ORDINAL].indexOf(encoding.y.type) > -1) {
              if (encoding.x) {
                var fieldStats = stats[encoding.y.field];
                if (fieldStats && vl.fieldDef.cardinality(encoding.y, stats) > 30) {
                  (encoding.x.axis = encoding.x.axis || {}).orient = 'top';
                }
              }
            }

            // Use smaller band size if has X or Y has cardinality > 10 or has a facet
            if (encoding.row ||
                (encoding.y && stats[encoding.y.field] && vl.fieldDef.cardinality(encoding.y, stats) > 10)) {
              (encoding.y.scale = encoding.y.scale || {}).bandSize = 12;
            }

            if (encoding.column ||
                (encoding.x && stats[encoding.x.field] && vl.fieldDef.cardinality(encoding.x, stats) > 10)) {
              (encoding.x.scale = encoding.x.scale || {}).bandSize = 12;
            }

            if (encoding.color && encoding.color.type === vl.type.NOMINAL &&
                vl.fieldDef.cardinality(encoding.color, stats) > 10) {
              (encoding.color.scale = encoding.color.scale || {}).range = 'category20';
            }
          }

          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? vl.shorthand.shorten(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }

        function render(spec) {
          if (!spec) {
            if (view) {
              view.off('mouseover');
              view.off('mouseout');
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          scope.renderer = getRenderer(spec);

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart.fieldSetKey))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(chart) {
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                // view.renderer(getRenderer(spec.width, scope.height));
                view.update();

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, '', scope.chart.vlSpec);
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNext();
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var view;
        scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view = null;
          }
          var shorthand = getShorthand();
          if (consts.debug && $window.views) {
            delete $window.views[shorthand];
          }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'dl', 'vl', 'Dataset', 'Logger', '_', function (Bookmarks, consts, dl, vl, Dataset, Logger, _) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showMark: '@',
        showSort: '@',
        showTranspose: '@',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          scale.type = scale.type === 'log' ? 'linear' : 'log';
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };
        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          return scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterNull = spec.config.filterNull === true ? undefined : true;
        };

        scope.toggleFilterNull.support = function(spec, stats) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) &&
                (fieldDef.name in stats) &&
                stats[fieldDef.name].missing > 0
              ) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {
          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand);
          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          console.log('toggleSort', currentMode, newMode);

          var channels = toggleSort.channels(spec);
          spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (dl.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec, stats) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.spec.alwaysNoOcclusion(spec, stats)) {
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec, Dataset.stats)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          vl.spec.transpose(scope.chart.vlSpec);
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmpzIiwiYWxlcnRzL2FsZXJ0cy5zZXJ2aWNlLmpzIiwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5qcyIsImJvb2ttYXJrcy9ib29rbWFya3Muc2VydmljZS5qcyIsImNvbmZpZy9jb25maWcuc2VydmljZS5qcyIsImZpZWxkaW5mby9maWVsZGluZm8uanMiLCJkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5qcyIsImRhdGFzZXQvYWRkdXJsZGF0YXNldC5qcyIsImRhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5qcyIsImRhdGFzZXQvZGF0YXNldC5zZXJ2aWNlLmpzIiwiZGF0YXNldC9kYXRhc2V0bW9kYWwuanMiLCJkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5qcyIsImRhdGFzZXQvZmlsZWRyb3B6b25lLmpzIiwiZGF0YXNldC9wYXN0ZWRhdGFzZXQuanMiLCJkYXRhc2V0L3NhbXBsZWRhdGEuanMiLCJsb2dnZXIvbG9nZ2VyLnNlcnZpY2UuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsY2xvc2VidXR0b24uanMiLCJtb2RhbC9tb2RhbHMuc2VydmljZS5qcyIsInNjaGVtYS9zY2hlbWEuc2VydmljZS5qcyIsInRhYnMvdGFiLmpzIiwidGFicy90YWJzZXQuanMiLCJ2bHBsb3QvdmxwbG90LmpzIiwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuanMiLCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmpzIiwiZmlsdGVycy9jb21wYWN0anNvbi9jb21wYWN0anNvbi5maWx0ZXIuanMiLCJmaWx0ZXJzL3JlcG9ydHVybC9yZXBvcnR1cmwuZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvdW5kZXJzY29yZTJzcGFjZS91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QyxPQUFPLHNCQUFzQixPQUFPOztNQUV0QyxPQUFPOzs7SUFHVCxPQUFPLE9BQU8sVUFBVSxZQUFZLGdCQUFnQjtNQUNuRDs7OztBQzNETDs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTztHQUNaLE9BQU8sYUFBYSxZQUFZO0lBQy9CLE9BQU8sVUFBVSxPQUFPO01BQ3RCLE9BQU8sT0FBTyxVQUFVOztLQUV6Qjs7OztBQ2ZMOzs7Ozs7Ozs7O0FBVUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxvQkFBb0IsWUFBWTtJQUN0QyxPQUFPLFVBQVUsT0FBTztNQUN0QixPQUFPLFFBQVEsTUFBTSxRQUFRLE9BQU8sT0FBTzs7S0FFNUMiLCJmaWxlIjoidmx1aS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogSlNPTjMgd2l0aCBjb21wYWN0IHN0cmluZ2lmeSAtLSBNb2RpZmllZCBieSBLYW5pdCBXb25nc3VwaGFzYXdhdC4gICBodHRwczovL2dpdGh1Yi5jb20va2FuaXR3L2pzb24zXG4gKlxuICogRm9ya2VkIGZyb20gSlNPTiB2My4zLjIgfCBodHRwczovL2Jlc3RpZWpzLmdpdGh1Yi5pby9qc29uMyB8IENvcHlyaWdodCAyMDEyLTIwMTQsIEtpdCBDYW1icmlkZ2UgfCBodHRwOi8va2l0Lm1pdC1saWNlbnNlLm9yZ1xuICovXG47KGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IHRoZSBgZGVmaW5lYCBmdW5jdGlvbiBleHBvc2VkIGJ5IGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy4gVGhlXG4gIC8vIHN0cmljdCBgZGVmaW5lYCBjaGVjayBpcyBuZWNlc3NhcnkgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBgci5qc2AuXG4gIHZhciBpc0xvYWRlciA9IHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kO1xuXG4gIC8vIEEgc2V0IG9mIHR5cGVzIHVzZWQgdG8gZGlzdGluZ3Vpc2ggb2JqZWN0cyBmcm9tIHByaW1pdGl2ZXMuXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICBcImZ1bmN0aW9uXCI6IHRydWUsXG4gICAgXCJvYmplY3RcIjogdHJ1ZVxuICB9O1xuXG4gIC8vIERldGVjdCB0aGUgYGV4cG9ydHNgIG9iamVjdCBleHBvc2VkIGJ5IENvbW1vbkpTIGltcGxlbWVudGF0aW9ucy5cbiAgdmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuICAvLyBVc2UgdGhlIGBnbG9iYWxgIG9iamVjdCBleHBvc2VkIGJ5IE5vZGUgKGluY2x1ZGluZyBCcm93c2VyaWZ5IHZpYVxuICAvLyBgaW5zZXJ0LW1vZHVsZS1nbG9iYWxzYCksIE5hcndoYWwsIGFuZCBSaW5nbyBhcyB0aGUgZGVmYXVsdCBjb250ZXh0LFxuICAvLyBhbmQgdGhlIGB3aW5kb3dgIG9iamVjdCBpbiBicm93c2Vycy4gUmhpbm8gZXhwb3J0cyBhIGBnbG9iYWxgIGZ1bmN0aW9uXG4gIC8vIGluc3RlYWQuXG4gIHZhciByb290ID0gb2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93IHx8IHRoaXMsXG4gICAgICBmcmVlR2xvYmFsID0gZnJlZUV4cG9ydHMgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgdHlwZW9mIGdsb2JhbCA9PSBcIm9iamVjdFwiICYmIGdsb2JhbDtcblxuICBpZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbFtcImdsb2JhbFwiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wid2luZG93XCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJzZWxmXCJdID09PSBmcmVlR2xvYmFsKSkge1xuICAgIHJvb3QgPSBmcmVlR2xvYmFsO1xuICB9XG5cbiAgLy8gUHVibGljOiBJbml0aWFsaXplcyBKU09OIDMgdXNpbmcgdGhlIGdpdmVuIGBjb250ZXh0YCBvYmplY3QsIGF0dGFjaGluZyB0aGVcbiAgLy8gYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgZnVuY3Rpb25zIHRvIHRoZSBzcGVjaWZpZWQgYGV4cG9ydHNgIG9iamVjdC5cbiAgZnVuY3Rpb24gcnVuSW5Db250ZXh0KGNvbnRleHQsIGV4cG9ydHMpIHtcbiAgICBjb250ZXh0IHx8IChjb250ZXh0ID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcbiAgICBleHBvcnRzIHx8IChleHBvcnRzID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcblxuICAgIC8vIE5hdGl2ZSBjb25zdHJ1Y3RvciBhbGlhc2VzLlxuICAgIHZhciBOdW1iZXIgPSBjb250ZXh0W1wiTnVtYmVyXCJdIHx8IHJvb3RbXCJOdW1iZXJcIl0sXG4gICAgICAgIFN0cmluZyA9IGNvbnRleHRbXCJTdHJpbmdcIl0gfHwgcm9vdFtcIlN0cmluZ1wiXSxcbiAgICAgICAgT2JqZWN0ID0gY29udGV4dFtcIk9iamVjdFwiXSB8fCByb290W1wiT2JqZWN0XCJdLFxuICAgICAgICBEYXRlID0gY29udGV4dFtcIkRhdGVcIl0gfHwgcm9vdFtcIkRhdGVcIl0sXG4gICAgICAgIFN5bnRheEVycm9yID0gY29udGV4dFtcIlN5bnRheEVycm9yXCJdIHx8IHJvb3RbXCJTeW50YXhFcnJvclwiXSxcbiAgICAgICAgVHlwZUVycm9yID0gY29udGV4dFtcIlR5cGVFcnJvclwiXSB8fCByb290W1wiVHlwZUVycm9yXCJdLFxuICAgICAgICBNYXRoID0gY29udGV4dFtcIk1hdGhcIl0gfHwgcm9vdFtcIk1hdGhcIl0sXG4gICAgICAgIG5hdGl2ZUpTT04gPSBjb250ZXh0W1wiSlNPTlwiXSB8fCByb290W1wiSlNPTlwiXTtcblxuICAgIC8vIERlbGVnYXRlIHRvIHRoZSBuYXRpdmUgYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgaW1wbGVtZW50YXRpb25zLlxuICAgIGlmICh0eXBlb2YgbmF0aXZlSlNPTiA9PSBcIm9iamVjdFwiICYmIG5hdGl2ZUpTT04pIHtcbiAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gbmF0aXZlSlNPTi5zdHJpbmdpZnk7XG4gICAgICBleHBvcnRzLnBhcnNlID0gbmF0aXZlSlNPTi5wYXJzZTtcbiAgICB9XG5cbiAgICAvLyBDb252ZW5pZW5jZSBhbGlhc2VzLlxuICAgIHZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGUsXG4gICAgICAgIGdldENsYXNzID0gb2JqZWN0UHJvdG8udG9TdHJpbmcsXG4gICAgICAgIGlzUHJvcGVydHksIGZvckVhY2gsIHVuZGVmO1xuXG4gICAgLy8gVGVzdCB0aGUgYERhdGUjZ2V0VVRDKmAgbWV0aG9kcy4gQmFzZWQgb24gd29yayBieSBAWWFmZmxlLlxuICAgIHZhciBpc0V4dGVuZGVkID0gbmV3IERhdGUoLTM1MDk4MjczMzQ1NzMyOTIpO1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgYGdldFVUQ0Z1bGxZZWFyYCwgYE1vbnRoYCwgYW5kIGBEYXRlYCBtZXRob2RzIHJldHVybiBub25zZW5zaWNhbFxuICAgICAgLy8gcmVzdWx0cyBmb3IgY2VydGFpbiBkYXRlcyBpbiBPcGVyYSA+PSAxMC41My5cbiAgICAgIGlzRXh0ZW5kZWQgPSBpc0V4dGVuZGVkLmdldFVUQ0Z1bGxZZWFyKCkgPT0gLTEwOTI1MiAmJiBpc0V4dGVuZGVkLmdldFVUQ01vbnRoKCkgPT09IDAgJiYgaXNFeHRlbmRlZC5nZXRVVENEYXRlKCkgPT09IDEgJiZcbiAgICAgICAgLy8gU2FmYXJpIDwgMi4wLjIgc3RvcmVzIHRoZSBpbnRlcm5hbCBtaWxsaXNlY29uZCB0aW1lIHZhbHVlIGNvcnJlY3RseSxcbiAgICAgICAgLy8gYnV0IGNsaXBzIHRoZSB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGRhdGUgbWV0aG9kcyB0byB0aGUgcmFuZ2Ugb2ZcbiAgICAgICAgLy8gc2lnbmVkIDMyLWJpdCBpbnRlZ2VycyAoWy0yICoqIDMxLCAyICoqIDMxIC0gMV0pLlxuICAgICAgICBpc0V4dGVuZGVkLmdldFVUQ0hvdXJzKCkgPT0gMTAgJiYgaXNFeHRlbmRlZC5nZXRVVENNaW51dGVzKCkgPT0gMzcgJiYgaXNFeHRlbmRlZC5nZXRVVENTZWNvbmRzKCkgPT0gNiAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbGxpc2Vjb25kcygpID09IDcwODtcbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG5cbiAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBuYXRpdmUgYEpTT04uc3RyaW5naWZ5YCBhbmQgYHBhcnNlYFxuICAgIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgc3BlYy1jb21wbGlhbnQuIEJhc2VkIG9uIHdvcmsgYnkgS2VuIFNueWRlci5cbiAgICBmdW5jdGlvbiBoYXMobmFtZSkge1xuICAgICAgaWYgKGhhc1tuYW1lXSAhPT0gdW5kZWYpIHtcbiAgICAgICAgLy8gUmV0dXJuIGNhY2hlZCBmZWF0dXJlIHRlc3QgcmVzdWx0LlxuICAgICAgICByZXR1cm4gaGFzW25hbWVdO1xuICAgICAgfVxuICAgICAgdmFyIGlzU3VwcG9ydGVkO1xuICAgICAgaWYgKG5hbWUgPT0gXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIikge1xuICAgICAgICAvLyBJRSA8PSA3IGRvZXNuJ3Qgc3VwcG9ydCBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgdXNpbmcgc3F1YXJlXG4gICAgICAgIC8vIGJyYWNrZXQgbm90YXRpb24uIElFIDggb25seSBzdXBwb3J0cyB0aGlzIGZvciBwcmltaXRpdmVzLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IFwiYVwiWzBdICE9IFwiYVwiO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09IFwianNvblwiKSB7XG4gICAgICAgIC8vIEluZGljYXRlcyB3aGV0aGVyIGJvdGggYEpTT04uc3RyaW5naWZ5YCBhbmQgYEpTT04ucGFyc2VgIGFyZVxuICAgICAgICAvLyBzdXBwb3J0ZWQuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gaGFzKFwianNvbi1zdHJpbmdpZnlcIikgJiYgaGFzKFwianNvbi1wYXJzZVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWx1ZSwgc2VyaWFsaXplZCA9ICd7XCJhXCI6WzEsdHJ1ZSxmYWxzZSxudWxsLFwiXFxcXHUwMDAwXFxcXGJcXFxcblxcXFxmXFxcXHJcXFxcdFwiXX0nO1xuICAgICAgICAvLyBUZXN0IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1zdHJpbmdpZnlcIikge1xuICAgICAgICAgIHZhciBzdHJpbmdpZnkgPSBleHBvcnRzLnN0cmluZ2lmeSwgc3RyaW5naWZ5U3VwcG9ydGVkID0gdHlwZW9mIHN0cmluZ2lmeSA9PSBcImZ1bmN0aW9uXCIgJiYgaXNFeHRlbmRlZDtcbiAgICAgICAgICBpZiAoc3RyaW5naWZ5U3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAvLyBBIHRlc3QgZnVuY3Rpb24gb2JqZWN0IHdpdGggYSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kLlxuICAgICAgICAgICAgKHZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0pLnRvSlNPTiA9IHZhbHVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID1cbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDMuMWIxIGFuZCBiMiBzZXJpYWxpemUgc3RyaW5nLCBudW1iZXIsIGFuZCBib29sZWFuXG4gICAgICAgICAgICAgICAgLy8gcHJpbWl0aXZlcyBhcyBvYmplY3QgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KDApID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiwgYW5kIEpTT04gMiBzZXJpYWxpemUgd3JhcHBlZCBwcmltaXRpdmVzIGFzIG9iamVjdFxuICAgICAgICAgICAgICAgIC8vIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgTnVtYmVyKCkpID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgU3RyaW5nKCkpID09ICdcIlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSB2YWx1ZSBpcyBgbnVsbGAsIGB1bmRlZmluZWRgLCBvclxuICAgICAgICAgICAgICAgIC8vIGRvZXMgbm90IGRlZmluZSBhIGNhbm9uaWNhbCBKU09OIHJlcHJlc2VudGF0aW9uICh0aGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggYHRvSlNPTmAgcHJvcGVydGllcyBhcyB3ZWxsLCAqdW5sZXNzKiB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRoaW4gYW4gb2JqZWN0IG9yIGFycmF5KS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoZ2V0Q2xhc3MpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIElFIDggc2VyaWFsaXplcyBgdW5kZWZpbmVkYCBhcyBgXCJ1bmRlZmluZWRcImAuIFNhZmFyaSA8PSA1LjEuNyBhbmRcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMyBwYXNzIHRoaXMgdGVzdC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodW5kZWYpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNyBhbmQgRkYgMy4xYjMgdGhyb3cgYEVycm9yYHMgYW5kIGBUeXBlRXJyb3JgcyxcbiAgICAgICAgICAgICAgICAvLyByZXNwZWN0aXZlbHksIGlmIHRoZSB2YWx1ZSBpcyBvbWl0dGVkIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBub3QgYSBudW1iZXIsXG4gICAgICAgICAgICAgICAgLy8gc3RyaW5nLCBhcnJheSwgb2JqZWN0LCBCb29sZWFuLCBvciBgbnVsbGAgbGl0ZXJhbC4gVGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzIGFzIHdlbGwsIHVubGVzcyB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyBpbnNpZGUgb2JqZWN0IG9yIGFycmF5IGxpdGVyYWxzLiBZVUkgMy4wLjBiMSBpZ25vcmVzIGN1c3RvbSBgdG9KU09OYFxuICAgICAgICAgICAgICAgIC8vIG1ldGhvZHMgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3ZhbHVlXSkgPT0gXCJbMV1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBzZXJpYWxpemVzIGBbdW5kZWZpbmVkXWAgYXMgYFwiW11cImAgaW5zdGVhZCBvZlxuICAgICAgICAgICAgICAgIC8vIGBcIltudWxsXVwiYC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmXSkgPT0gXCJbbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFlVSSAzLjAuMGIxIGZhaWxzIHRvIHNlcmlhbGl6ZSBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwpID09IFwibnVsbFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgaGFsdHMgc2VyaWFsaXphdGlvbiBpZiBhbiBhcnJheSBjb250YWlucyBhIGZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgIC8vIGBbMSwgdHJ1ZSwgZ2V0Q2xhc3MsIDFdYCBzZXJpYWxpemVzIGFzIFwiWzEsdHJ1ZSxdLFwiLiBGRiAzLjFiM1xuICAgICAgICAgICAgICAgIC8vIGVsaWRlcyBub24tSlNPTiB2YWx1ZXMgZnJvbSBvYmplY3RzIGFuZCBhcnJheXMsIHVubGVzcyB0aGV5XG4gICAgICAgICAgICAgICAgLy8gZGVmaW5lIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWYsIGdldENsYXNzLCBudWxsXSkgPT0gXCJbbnVsbCxudWxsLG51bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgc2VyaWFsaXphdGlvbiB0ZXN0LiBGRiAzLjFiMSB1c2VzIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlc1xuICAgICAgICAgICAgICAgIC8vIHdoZXJlIGNoYXJhY3RlciBlc2NhcGUgY29kZXMgYXJlIGV4cGVjdGVkIChlLmcuLCBgXFxiYCA9PiBgXFx1MDAwOGApLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh7IFwiYVwiOiBbdmFsdWUsIHRydWUsIGZhbHNlLCBudWxsLCBcIlxceDAwXFxiXFxuXFxmXFxyXFx0XCJdIH0pID09IHNlcmlhbGl6ZWQgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSBhbmQgYjIgaWdub3JlIHRoZSBgZmlsdGVyYCBhbmQgYHdpZHRoYCBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwsIHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoWzEsIDJdLCBudWxsLCAxKSA9PSBcIltcXG4gMSxcXG4gMlxcbl1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIEpTT04gMiwgUHJvdG90eXBlIDw9IDEuNywgYW5kIG9sZGVyIFdlYktpdCBidWlsZHMgaW5jb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAvLyBzZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC04LjY0ZTE1KSkgPT0gJ1wiLTI3MTgyMS0wNC0yMFQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gVGhlIG1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNSwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoOC42NGUxNSkpID09ICdcIisyNzU3NjAtMDktMTNUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggPD0gMTEuMCBpbmNvcnJlY3RseSBzZXJpYWxpemVzIHllYXJzIHByaW9yIHRvIDAgYXMgbmVnYXRpdmVcbiAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IHllYXJzIGluc3RlYWQgb2Ygc2l4LWRpZ2l0IHllYXJzLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtNjIxOTg3NTUyZTUpKSA9PSAnXCItMDAwMDAxLTAxLTAxVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjUgYW5kIE9wZXJhID49IDEwLjUzIGluY29ycmVjdGx5IHNlcmlhbGl6ZSBtaWxsaXNlY29uZFxuICAgICAgICAgICAgICAgIC8vIHZhbHVlcyBsZXNzIHRoYW4gMTAwMC4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTEpKSA9PSAnXCIxOTY5LTEyLTMxVDIzOjU5OjU5Ljk5OVpcIic7XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gc3RyaW5naWZ5U3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRlc3QgYEpTT04ucGFyc2VgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tcGFyc2VcIikge1xuICAgICAgICAgIHZhciBwYXJzZSA9IGV4cG9ydHMucGFyc2U7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhIGJhcmUgbGl0ZXJhbCBpcyBwcm92aWRlZC5cbiAgICAgICAgICAgICAgLy8gQ29uZm9ybWluZyBpbXBsZW1lbnRhdGlvbnMgc2hvdWxkIGFsc28gY29lcmNlIHRoZSBpbml0aWFsIGFyZ3VtZW50IHRvXG4gICAgICAgICAgICAgIC8vIGEgc3RyaW5nIHByaW9yIHRvIHBhcnNpbmcuXG4gICAgICAgICAgICAgIGlmIChwYXJzZShcIjBcIikgPT09IDAgJiYgIXBhcnNlKGZhbHNlKSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBwYXJzaW5nIHRlc3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBwYXJzZShzZXJpYWxpemVkKTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyc2VTdXBwb3J0ZWQgPSB2YWx1ZVtcImFcIl0ubGVuZ3RoID09IDUgJiYgdmFsdWVbXCJhXCJdWzBdID09PSAxO1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS4yIGFuZCBGRiAzLjFiMSBhbGxvdyB1bmVzY2FwZWQgdGFicyBpbiBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9ICFwYXJzZSgnXCJcXHRcIicpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wIGFuZCA0LjAuMSBhbGxvdyBsZWFkaW5nIGArYCBzaWducyBhbmQgbGVhZGluZ1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgcG9pbnRzLiBGRiA0LjAsIDQuMC4xLCBhbmQgSUUgOS0xMCBhbHNvIGFsbG93XG4gICAgICAgICAgICAgICAgICAgICAgLy8gY2VydGFpbiBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMDFcIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCwgNC4wLjEsIGFuZCBSaGlubyAxLjdSMy1SNCBhbGxvdyB0cmFpbGluZyBkZWNpbWFsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gcG9pbnRzLiBUaGVzZSBlbnZpcm9ubWVudHMsIGFsb25nIHdpdGggRkYgMy4xYjEgYW5kIDIsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBhbGxvdyB0cmFpbGluZyBjb21tYXMgaW4gSlNPTiBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjEuXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBwYXJzZVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc1tuYW1lXSA9ICEhaXNTdXBwb3J0ZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRydWUpIHsgLy8gdXNlZCB0byBiZSAhaGFzKFwianNvblwiKVxuICAgICAgLy8gQ29tbW9uIGBbW0NsYXNzXV1gIG5hbWUgYWxpYXNlcy5cbiAgICAgIHZhciBmdW5jdGlvbkNsYXNzID0gXCJbb2JqZWN0IEZ1bmN0aW9uXVwiLFxuICAgICAgICAgIGRhdGVDbGFzcyA9IFwiW29iamVjdCBEYXRlXVwiLFxuICAgICAgICAgIG51bWJlckNsYXNzID0gXCJbb2JqZWN0IE51bWJlcl1cIixcbiAgICAgICAgICBzdHJpbmdDbGFzcyA9IFwiW29iamVjdCBTdHJpbmddXCIsXG4gICAgICAgICAgYXJyYXlDbGFzcyA9IFwiW29iamVjdCBBcnJheV1cIixcbiAgICAgICAgICBib29sZWFuQ2xhc3MgPSBcIltvYmplY3QgQm9vbGVhbl1cIjtcblxuICAgICAgLy8gRGV0ZWN0IGluY29tcGxldGUgc3VwcG9ydCBmb3IgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIGJ5IGluZGV4LlxuICAgICAgdmFyIGNoYXJJbmRleEJ1Z2d5ID0gaGFzKFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpO1xuXG4gICAgICAvLyBEZWZpbmUgYWRkaXRpb25hbCB1dGlsaXR5IG1ldGhvZHMgaWYgdGhlIGBEYXRlYCBtZXRob2RzIGFyZSBidWdneS5cbiAgICAgIGlmICghaXNFeHRlbmRlZCkge1xuICAgICAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgICAgICAvLyBBIG1hcHBpbmcgYmV0d2VlbiB0aGUgbW9udGhzIG9mIHRoZSB5ZWFyIGFuZCB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlblxuICAgICAgICAvLyBKYW51YXJ5IDFzdCBhbmQgdGhlIGZpcnN0IG9mIHRoZSByZXNwZWN0aXZlIG1vbnRoLlxuICAgICAgICB2YXIgTW9udGhzID0gWzAsIDMxLCA1OSwgOTAsIDEyMCwgMTUxLCAxODEsIDIxMiwgMjQzLCAyNzMsIDMwNCwgMzM0XTtcbiAgICAgICAgLy8gSW50ZXJuYWw6IENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW4gdGhlIFVuaXggZXBvY2ggYW5kIHRoZVxuICAgICAgICAvLyBmaXJzdCBkYXkgb2YgdGhlIGdpdmVuIG1vbnRoLlxuICAgICAgICB2YXIgZ2V0RGF5ID0gZnVuY3Rpb24gKHllYXIsIG1vbnRoKSB7XG4gICAgICAgICAgcmV0dXJuIE1vbnRoc1ttb250aF0gKyAzNjUgKiAoeWVhciAtIDE5NzApICsgZmxvb3IoKHllYXIgLSAxOTY5ICsgKG1vbnRoID0gKyhtb250aCA+IDEpKSkgLyA0KSAtIGZsb29yKCh5ZWFyIC0gMTkwMSArIG1vbnRoKSAvIDEwMCkgKyBmbG9vcigoeWVhciAtIDE2MDEgKyBtb250aCkgLyA0MDApO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyBpZiBhIHByb3BlcnR5IGlzIGEgZGlyZWN0IHByb3BlcnR5IG9mIHRoZSBnaXZlblxuICAgICAgLy8gb2JqZWN0LiBEZWxlZ2F0ZXMgdG8gdGhlIG5hdGl2ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBtZXRob2QuXG4gICAgICBpZiAoIShpc1Byb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHkpKSB7XG4gICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICBpZiAoKG1lbWJlcnMuX19wcm90b19fID0gbnVsbCwgbWVtYmVycy5fX3Byb3RvX18gPSB7XG4gICAgICAgICAgICAvLyBUaGUgKnByb3RvKiBwcm9wZXJ0eSBjYW5ub3QgYmUgc2V0IG11bHRpcGxlIHRpbWVzIGluIHJlY2VudFxuICAgICAgICAgICAgLy8gdmVyc2lvbnMgb2YgRmlyZWZveCBhbmQgU2VhTW9ua2V5LlxuICAgICAgICAgICAgXCJ0b1N0cmluZ1wiOiAxXG4gICAgICAgICAgfSwgbWVtYmVycykudG9TdHJpbmcgIT0gZ2V0Q2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuMyBkb2Vzbid0IGltcGxlbWVudCBgT2JqZWN0I2hhc093blByb3BlcnR5YCwgYnV0XG4gICAgICAgICAgICAvLyBzdXBwb3J0cyB0aGUgbXV0YWJsZSAqcHJvdG8qIHByb3BlcnR5LlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAvLyBDYXB0dXJlIGFuZCBicmVhayB0aGUgb2JqZWN0J3MgcHJvdG90eXBlIGNoYWluIChzZWUgc2VjdGlvbiA4LjYuMlxuICAgICAgICAgICAgICAvLyBvZiB0aGUgRVMgNS4xIHNwZWMpLiBUaGUgcGFyZW50aGVzaXplZCBleHByZXNzaW9uIHByZXZlbnRzIGFuXG4gICAgICAgICAgICAgIC8vIHVuc2FmZSB0cmFuc2Zvcm1hdGlvbiBieSB0aGUgQ2xvc3VyZSBDb21waWxlci5cbiAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsID0gdGhpcy5fX3Byb3RvX18sIHJlc3VsdCA9IHByb3BlcnR5IGluICh0aGlzLl9fcHJvdG9fXyA9IG51bGwsIHRoaXMpO1xuICAgICAgICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBwcm90b3R5cGUgY2hhaW4uXG4gICAgICAgICAgICAgIHRoaXMuX19wcm90b19fID0gb3JpZ2luYWw7XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDYXB0dXJlIGEgcmVmZXJlbmNlIHRvIHRoZSB0b3AtbGV2ZWwgYE9iamVjdGAgY29uc3RydWN0b3IuXG4gICAgICAgICAgICBjb25zdHJ1Y3RvciA9IG1lbWJlcnMuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgdG8gc2ltdWxhdGUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW5cbiAgICAgICAgICAgIC8vIG90aGVyIGVudmlyb25tZW50cy5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgdmFyIHBhcmVudCA9ICh0aGlzLmNvbnN0cnVjdG9yIHx8IGNvbnN0cnVjdG9yKS5wcm90b3R5cGU7XG4gICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmICEocHJvcGVydHkgaW4gcGFyZW50ICYmIHRoaXNbcHJvcGVydHldID09PSBwYXJlbnRbcHJvcGVydHldKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIG1lbWJlcnMgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBpc1Byb3BlcnR5LmNhbGwodGhpcywgcHJvcGVydHkpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogTm9ybWFsaXplcyB0aGUgYGZvci4uLmluYCBpdGVyYXRpb24gYWxnb3JpdGhtIGFjcm9zc1xuICAgICAgLy8gZW52aXJvbm1lbnRzLiBFYWNoIGVudW1lcmF0ZWQga2V5IGlzIHlpZWxkZWQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzaXplID0gMCwgUHJvcGVydGllcywgbWVtYmVycywgcHJvcGVydHk7XG5cbiAgICAgICAgLy8gVGVzdHMgZm9yIGJ1Z3MgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQncyBgZm9yLi4uaW5gIGFsZ29yaXRobS4gVGhlXG4gICAgICAgIC8vIGB2YWx1ZU9mYCBwcm9wZXJ0eSBpbmhlcml0cyB0aGUgbm9uLWVudW1lcmFibGUgZmxhZyBmcm9tXG4gICAgICAgIC8vIGBPYmplY3QucHJvdG90eXBlYCBpbiBvbGRlciB2ZXJzaW9ucyBvZiBJRSwgTmV0c2NhcGUsIGFuZCBNb3ppbGxhLlxuICAgICAgICAoUHJvcGVydGllcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLnZhbHVlT2YgPSAwO1xuICAgICAgICB9KS5wcm90b3R5cGUudmFsdWVPZiA9IDA7XG5cbiAgICAgICAgLy8gSXRlcmF0ZSBvdmVyIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBgUHJvcGVydGllc2AgY2xhc3MuXG4gICAgICAgIG1lbWJlcnMgPSBuZXcgUHJvcGVydGllcygpO1xuICAgICAgICBmb3IgKHByb3BlcnR5IGluIG1lbWJlcnMpIHtcbiAgICAgICAgICAvLyBJZ25vcmUgYWxsIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIGlmIChpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFByb3BlcnRpZXMgPSBtZW1iZXJzID0gbnVsbDtcblxuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGl0ZXJhdGlvbiBhbGdvcml0aG0uXG4gICAgICAgIGlmICghc2l6ZSkge1xuICAgICAgICAgIC8vIEEgbGlzdCBvZiBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBtZW1iZXJzID0gW1widmFsdWVPZlwiLCBcInRvU3RyaW5nXCIsIFwidG9Mb2NhbGVTdHJpbmdcIiwgXCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLCBcImlzUHJvdG90eXBlT2ZcIiwgXCJoYXNPd25Qcm9wZXJ0eVwiLCBcImNvbnN0cnVjdG9yXCJdO1xuICAgICAgICAgIC8vIElFIDw9IDgsIE1vemlsbGEgMS4wLCBhbmQgTmV0c2NhcGUgNi4yIGlnbm9yZSBzaGFkb3dlZCBub24tZW51bWVyYWJsZVxuICAgICAgICAgIC8vIHByb3BlcnRpZXMuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgbGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGhhc1Byb3BlcnR5ID0gIWlzRnVuY3Rpb24gJiYgdHlwZW9mIG9iamVjdC5jb25zdHJ1Y3RvciAhPSBcImZ1bmN0aW9uXCIgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG9iamVjdC5oYXNPd25Qcm9wZXJ0eV0gJiYgb2JqZWN0Lmhhc093blByb3BlcnR5IHx8IGlzUHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBHZWNrbyA8PSAxLjAgZW51bWVyYXRlcyB0aGUgYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIHVuZGVyXG4gICAgICAgICAgICAgIC8vIGNlcnRhaW4gY29uZGl0aW9uczsgSUUgZG9lcyBub3QuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgZWFjaCBub24tZW51bWVyYWJsZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gbWVtYmVycy5sZW5ndGg7IHByb3BlcnR5ID0gbWVtYmVyc1stLWxlbmd0aF07IGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgY2FsbGJhY2socHJvcGVydHkpKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHNpemUgPT0gMikge1xuICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuNCBlbnVtZXJhdGVzIHNoYWRvd2VkIHByb3BlcnRpZXMgdHdpY2UuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZXQgb2YgaXRlcmF0ZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBTdG9yZSBlYWNoIHByb3BlcnR5IG5hbWUgdG8gcHJldmVudCBkb3VibGUgZW51bWVyYXRpb24uIFRoZVxuICAgICAgICAgICAgICAvLyBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgaXMgbm90IGVudW1lcmF0ZWQgZHVlIHRvIGNyb3NzLVxuICAgICAgICAgICAgICAvLyBlbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgIWlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkgJiYgKG1lbWJlcnNbcHJvcGVydHldID0gMSkgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBidWdzIGRldGVjdGVkOyB1c2UgdGhlIHN0YW5kYXJkIGBmb3IuLi5pbmAgYWxnb3JpdGhtLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGlzQ29uc3RydWN0b3I7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiAhKGlzQ29uc3RydWN0b3IgPSBwcm9wZXJ0eSA9PT0gXCJjb25zdHJ1Y3RvclwiKSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgZHVlIHRvXG4gICAgICAgICAgICAvLyBjcm9zcy1lbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICBpZiAoaXNDb25zdHJ1Y3RvciB8fCBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCAocHJvcGVydHkgPSBcImNvbnN0cnVjdG9yXCIpKSkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9yRWFjaChvYmplY3QsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFB1YmxpYzogU2VyaWFsaXplcyBhIEphdmFTY3JpcHQgYHZhbHVlYCBhcyBhIEpTT04gc3RyaW5nLiBUaGUgb3B0aW9uYWxcbiAgICAgIC8vIGBmaWx0ZXJgIGFyZ3VtZW50IG1heSBzcGVjaWZ5IGVpdGhlciBhIGZ1bmN0aW9uIHRoYXQgYWx0ZXJzIGhvdyBvYmplY3QgYW5kXG4gICAgICAvLyBhcnJheSBtZW1iZXJzIGFyZSBzZXJpYWxpemVkLCBvciBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCBudW1iZXJzIHRoYXRcbiAgICAgIC8vIGluZGljYXRlcyB3aGljaCBwcm9wZXJ0aWVzIHNob3VsZCBiZSBzZXJpYWxpemVkLiBUaGUgb3B0aW9uYWwgYHdpZHRoYFxuICAgICAgLy8gYXJndW1lbnQgbWF5IGJlIGVpdGhlciBhIHN0cmluZyBvciBudW1iZXIgdGhhdCBzcGVjaWZpZXMgdGhlIGluZGVudGF0aW9uXG4gICAgICAvLyBsZXZlbCBvZiB0aGUgb3V0cHV0LlxuICAgICAgaWYgKHRydWUpIHtcbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIEVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFxcXFxcIixcbiAgICAgICAgICAzNDogJ1xcXFxcIicsXG4gICAgICAgICAgODogXCJcXFxcYlwiLFxuICAgICAgICAgIDEyOiBcIlxcXFxmXCIsXG4gICAgICAgICAgMTA6IFwiXFxcXG5cIixcbiAgICAgICAgICAxMzogXCJcXFxcclwiLFxuICAgICAgICAgIDk6IFwiXFxcXHRcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBDb252ZXJ0cyBgdmFsdWVgIGludG8gYSB6ZXJvLXBhZGRlZCBzdHJpbmcgc3VjaCB0aGF0IGl0c1xuICAgICAgICAvLyBsZW5ndGggaXMgYXQgbGVhc3QgZXF1YWwgdG8gYHdpZHRoYC4gVGhlIGB3aWR0aGAgbXVzdCBiZSA8PSA2LlxuICAgICAgICB2YXIgbGVhZGluZ1plcm9lcyA9IFwiMDAwMDAwXCI7XG4gICAgICAgIHZhciB0b1BhZGRlZFN0cmluZyA9IGZ1bmN0aW9uICh3aWR0aCwgdmFsdWUpIHtcbiAgICAgICAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIHdoZXJlIGAwID09IC0wYCwgYnV0IGBTdHJpbmcoLTApICE9PSBcIjBcImAuXG4gICAgICAgICAgcmV0dXJuIChsZWFkaW5nWmVyb2VzICsgKHZhbHVlIHx8IDApKS5zbGljZSgtd2lkdGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBEb3VibGUtcXVvdGVzIGEgc3RyaW5nIGB2YWx1ZWAsIHJlcGxhY2luZyBhbGwgQVNDSUkgY29udHJvbFxuICAgICAgICAvLyBjaGFyYWN0ZXJzIChjaGFyYWN0ZXJzIHdpdGggY29kZSB1bml0IHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDMxKSB3aXRoXG4gICAgICAgIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBRdW90ZSh2YWx1ZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gICAgICAgIHZhciB1bmljb2RlUHJlZml4ID0gXCJcXFxcdTAwXCI7XG4gICAgICAgIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSAnXCInLCBpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aCwgdXNlQ2hhckluZGV4ID0gIWNoYXJJbmRleEJ1Z2d5IHx8IGxlbmd0aCA+IDEwO1xuICAgICAgICAgIHZhciBzeW1ib2xzID0gdXNlQ2hhckluZGV4ICYmIChjaGFySW5kZXhCdWdneSA/IHZhbHVlLnNwbGl0KFwiXCIpIDogdmFsdWUpO1xuICAgICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgdmFyIGNoYXJDb2RlID0gdmFsdWUuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgICAvLyBJZiB0aGUgY2hhcmFjdGVyIGlzIGEgY29udHJvbCBjaGFyYWN0ZXIsIGFwcGVuZCBpdHMgVW5pY29kZSBvclxuICAgICAgICAgICAgLy8gc2hvcnRoYW5kIGVzY2FwZSBzZXF1ZW5jZTsgb3RoZXJ3aXNlLCBhcHBlbmQgdGhlIGNoYXJhY3RlciBhcy1pcy5cbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA4OiBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTI6IGNhc2UgMTM6IGNhc2UgMzQ6IGNhc2UgOTI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IEVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgKz0gdW5pY29kZVByZWZpeCArIHRvUGFkZGVkU3RyaW5nKDIsIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVzZUNoYXJJbmRleCA/IHN5bWJvbHNbaW5kZXhdIDogdmFsdWUuY2hhckF0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCArICdcIic7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZXMgYW4gb2JqZWN0LiBJbXBsZW1lbnRzIHRoZVxuICAgICAgICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgb2JqZWN0LCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHZhbHVlLCBjbGFzc05hbWUsIHllYXIsIG1vbnRoLCBkYXRlLCB0aW1lLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCByZXN1bHRzLCBlbGVtZW50LCBpbmRleCwgbGVuZ3RoLCBwcmVmaXgsIHJlc3VsdDtcblxuICAgICAgICAgIG1heExpbmVMZW5ndGggPSBtYXhMaW5lTGVuZ3RoIHx8IDA7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTmVjZXNzYXJ5IGZvciBob3N0IG9iamVjdCBzdXBwb3J0LlxuICAgICAgICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBkYXRlQ2xhc3MgJiYgIWlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDApIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRlcyBhcmUgc2VyaWFsaXplZCBhY2NvcmRpbmcgdG8gdGhlIGBEYXRlI3RvSlNPTmAgbWV0aG9kXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjkuNS40NC4gU2VlIHNlY3Rpb24gMTUuOS4xLjE1XG4gICAgICAgICAgICAgICAgLy8gZm9yIHRoZSBJU08gODYwMSBkYXRlIHRpbWUgc3RyaW5nIGZvcm1hdC5cbiAgICAgICAgICAgICAgICBpZiAoZ2V0RGF5KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb21wdXRlIHRoZSB5ZWFyLCBtb250aCwgZGF0ZSwgaG91cnMsIG1pbnV0ZXMsXG4gICAgICAgICAgICAgICAgICAvLyBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGlmIHRoZSBgZ2V0VVRDKmAgbWV0aG9kcyBhcmVcbiAgICAgICAgICAgICAgICAgIC8vIGJ1Z2d5LiBBZGFwdGVkIGZyb20gQFlhZmZsZSdzIGBkYXRlLXNoaW1gIHByb2plY3QuXG4gICAgICAgICAgICAgICAgICBkYXRlID0gZmxvb3IodmFsdWUgLyA4NjRlNSk7XG4gICAgICAgICAgICAgICAgICBmb3IgKHllYXIgPSBmbG9vcihkYXRlIC8gMzY1LjI0MjUpICsgMTk3MCAtIDE7IGdldERheSh5ZWFyICsgMSwgMCkgPD0gZGF0ZTsgeWVhcisrKTtcbiAgICAgICAgICAgICAgICAgIGZvciAobW9udGggPSBmbG9vcigoZGF0ZSAtIGdldERheSh5ZWFyLCAwKSkgLyAzMC40Mik7IGdldERheSh5ZWFyLCBtb250aCArIDEpIDw9IGRhdGU7IG1vbnRoKyspO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IDEgKyBkYXRlIC0gZ2V0RGF5KHllYXIsIG1vbnRoKTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBgdGltZWAgdmFsdWUgc3BlY2lmaWVzIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5IChzZWUgRVNcbiAgICAgICAgICAgICAgICAgIC8vIDUuMSBzZWN0aW9uIDE1LjkuMS4yKS4gVGhlIGZvcm11bGEgYChBICUgQiArIEIpICUgQmAgaXMgdXNlZFxuICAgICAgICAgICAgICAgICAgLy8gdG8gY29tcHV0ZSBgQSBtb2R1bG8gQmAsIGFzIHRoZSBgJWAgb3BlcmF0b3IgZG9lcyBub3RcbiAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmQgdG8gdGhlIGBtb2R1bG9gIG9wZXJhdGlvbiBmb3IgbmVnYXRpdmUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICAgIHRpbWUgPSAodmFsdWUgJSA4NjRlNSArIDg2NGU1KSAlIDg2NGU1O1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGFyZSBvYnRhaW5lZCBieVxuICAgICAgICAgICAgICAgICAgLy8gZGVjb21wb3NpbmcgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkuIFNlZSBzZWN0aW9uIDE1LjkuMS4xMC5cbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gZmxvb3IodGltZSAvIDM2ZTUpICUgMjQ7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gZmxvb3IodGltZSAvIDZlNCkgJSA2MDtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSBmbG9vcih0aW1lIC8gMWUzKSAlIDYwO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdGltZSAlIDFlMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgeWVhciA9IHZhbHVlLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgICBtb250aCA9IHZhbHVlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gdmFsdWUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgaG91cnMgPSB2YWx1ZS5nZXRVVENIb3VycygpO1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IHZhbHVlLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSB2YWx1ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB2YWx1ZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2VyaWFsaXplIGV4dGVuZGVkIHllYXJzIGNvcnJlY3RseS5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICh5ZWFyIDw9IDAgfHwgeWVhciA+PSAxZTQgPyAoeWVhciA8IDAgPyBcIi1cIiA6IFwiK1wiKSArIHRvUGFkZGVkU3RyaW5nKDYsIHllYXIgPCAwID8gLXllYXIgOiB5ZWFyKSA6IHRvUGFkZGVkU3RyaW5nKDQsIHllYXIpKSArXG4gICAgICAgICAgICAgICAgICBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1vbnRoICsgMSkgKyBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIGRhdGUpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1vbnRocywgZGF0ZXMsIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBzaG91bGQgaGF2ZSB0d29cbiAgICAgICAgICAgICAgICAgIC8vIGRpZ2l0czsgbWlsbGlzZWNvbmRzIHNob3VsZCBoYXZlIHRocmVlLlxuICAgICAgICAgICAgICAgICAgXCJUXCIgKyB0b1BhZGRlZFN0cmluZygyLCBob3VycykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1pbnV0ZXMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBzZWNvbmRzKSArXG4gICAgICAgICAgICAgICAgICAvLyBNaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUuMCwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICAgIFwiLlwiICsgdG9QYWRkZWRTdHJpbmcoMywgbWlsbGlzZWNvbmRzKSArIFwiWlwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9KU09OID09IFwiZnVuY3Rpb25cIiAmJiAoKGNsYXNzTmFtZSAhPSBudW1iZXJDbGFzcyAmJiBjbGFzc05hbWUgIT0gc3RyaW5nQ2xhc3MgJiYgY2xhc3NOYW1lICE9IGFycmF5Q2xhc3MpIHx8IGlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpKSB7XG4gICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAgICAgICAvLyBgTnVtYmVyYCwgYFN0cmluZ2AsIGBEYXRlYCwgYW5kIGBBcnJheWAgcHJvdG90eXBlcy4gSlNPTiAzXG4gICAgICAgICAgICAgIC8vIGlnbm9yZXMgYWxsIGB0b0pTT05gIG1ldGhvZHMgb24gdGhlc2Ugb2JqZWN0cyB1bmxlc3MgdGhleSBhcmVcbiAgICAgICAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04ocHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIElmIGEgcmVwbGFjZW1lbnQgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCBjYWxsIGl0IHRvIG9idGFpbiB0aGUgdmFsdWVcbiAgICAgICAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgICAgdmFsdWUgPSBjYWxsYmFjay5jYWxsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYm9vbGVhbkNsYXNzKSB7XG4gICAgICAgICAgICAvLyBCb29sZWFucyBhcmUgcmVwcmVzZW50ZWQgbGl0ZXJhbGx5LlxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgLy8gSlNPTiBudW1iZXJzIG11c3QgYmUgZmluaXRlLiBgSW5maW5pdHlgIGFuZCBgTmFOYCBhcmUgc2VyaWFsaXplZCBhc1xuICAgICAgICAgICAgLy8gYFwibnVsbFwiYC5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwID8gXCJcIiArIHZhbHVlIDogXCJudWxsXCI7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFN0cmluZ3MgYXJlIGRvdWJsZS1xdW90ZWQgYW5kIGVzY2FwZWQuXG4gICAgICAgICAgICByZXR1cm4gcXVvdGUoXCJcIiArIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhpcyBpcyBhIGxpbmVhciBzZWFyY2g7IHBlcmZvcm1hbmNlXG4gICAgICAgICAgICAvLyBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2YgdW5pcXVlIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBzdGFjay5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICBpZiAoc3RhY2tbbGVuZ3RoXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDeWNsaWMgc3RydWN0dXJlcyBjYW5ub3QgYmUgc2VyaWFsaXplZCBieSBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgdGhlIG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwgYW5kIGluZGVudCBvbmUgYWRkaXRpb25hbCBsZXZlbC5cbiAgICAgICAgICAgIHByZWZpeCA9IGluZGVudGF0aW9uO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIHJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIGFycmF5IGVsZW1lbnRzLlxuICAgICAgICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBzZXJpYWxpemUoaW5kZXgsIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudCA9PT0gdW5kZWYgPyBcIm51bGxcIiA6IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJbXFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIl1cIiA6XG4gICAgICAgICAgICAgICAgICBcIltcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIl1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwiW11cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgaW5kZXg9MDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdCBtZW1iZXJzLiBNZW1iZXJzIGFyZSBzZWxlY3RlZCBmcm9tXG4gICAgICAgICAgICAgIC8vIGVpdGhlciBhIHVzZXItc3BlY2lmaWVkIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMsIG9yIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAgLy8gaXRzZWxmLlxuICAgICAgICAgICAgICBmb3JFYWNoKHByb3BlcnRpZXMgfHwgdmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQsIGVsZW1lbnQgPSBzZXJpYWxpemUocHJvcGVydHksIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgICAvLyBBY2NvcmRpbmcgdG8gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMzogXCJJZiBgZ2FwYCB7d2hpdGVzcGFjZX1cbiAgICAgICAgICAgICAgICAgIC8vIGlzIG5vdCB0aGUgZW1wdHkgc3RyaW5nLCBsZXQgYG1lbWJlcmAge3F1b3RlKHByb3BlcnR5KSArIFwiOlwifVxuICAgICAgICAgICAgICAgICAgLy8gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgYG1lbWJlcmAgYW5kIHRoZSBgc3BhY2VgIGNoYXJhY3Rlci5cIlxuICAgICAgICAgICAgICAgICAgLy8gVGhlIFwiYHNwYWNlYCBjaGFyYWN0ZXJcIiByZWZlcnMgdG8gdGhlIGxpdGVyYWwgc3BhY2VcbiAgICAgICAgICAgICAgICAgIC8vIGNoYXJhY3Rlciwgbm90IHRoZSBgc3BhY2VgIHt3aWR0aH0gYXJndW1lbnQgcHJvdmlkZWQgdG9cbiAgICAgICAgICAgICAgICAgIC8vIGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIiArICh3aGl0ZXNwYWNlID8gXCIgXCIgOiBcIlwiKSArIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4KysgPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJ7XFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIn1cIiA6XG4gICAgICAgICAgICAgICAgICBcIntcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIn1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwie31cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgb2JqZWN0IGZyb20gdGhlIHRyYXZlcnNlZCBvYmplY3Qgc3RhY2suXG4gICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04uc3RyaW5naWZ5YC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG5cbiAgICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHdoaXRlc3BhY2UsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCBjbGFzc05hbWU7XG4gICAgICAgICAgaWYgKG9iamVjdFR5cGVzW3R5cGVvZiBmaWx0ZXJdICYmIGZpbHRlcikge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKGZpbHRlcikpID09IGZ1bmN0aW9uQ2xhc3MpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmaWx0ZXI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIHByb3BlcnR5IG5hbWVzIGFycmF5IGludG8gYSBtYWtlc2hpZnQgc2V0LlxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuZ3RoID0gZmlsdGVyLmxlbmd0aCwgdmFsdWU7IGluZGV4IDwgbGVuZ3RoOyB2YWx1ZSA9IGZpbHRlcltpbmRleCsrXSwgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKSksIGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcyB8fCBjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpICYmIChwcm9wZXJ0aWVzW3ZhbHVlXSA9IDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHdpZHRoKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwod2lkdGgpKSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBgd2lkdGhgIHRvIGFuIGludGVnZXIgYW5kIGNyZWF0ZSBhIHN0cmluZyBjb250YWluaW5nXG4gICAgICAgICAgICAgIC8vIGB3aWR0aGAgbnVtYmVyIG9mIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgIGlmICgod2lkdGggLT0gd2lkdGggJSAxKSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKHdoaXRlc3BhY2UgPSBcIlwiLCB3aWR0aCA+IDEwICYmICh3aWR0aCA9IDEwKTsgd2hpdGVzcGFjZS5sZW5ndGggPCB3aWR0aDsgd2hpdGVzcGFjZSArPSBcIiBcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAgIHdoaXRlc3BhY2UgPSB3aWR0aC5sZW5ndGggPD0gMTAgPyB3aWR0aCA6IHdpZHRoLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIGRpc2NhcmRzIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGVtcHR5IHN0cmluZyBrZXlzXG4gICAgICAgICAgLy8gKGBcIlwiYCkgb25seSBpZiB0aGV5IGFyZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBhbiBvYmplY3QgbWVtYmVyIGxpc3RcbiAgICAgICAgICAvLyAoZS5nLiwgYCEoXCJcIiBpbiB7IFwiXCI6IDF9KWApLlxuICAgICAgICAgIHJldHVybiBzZXJpYWxpemUoXCJcIiwgKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gc291cmNlLCB2YWx1ZSksIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBcIlwiLCBbXSwgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZXhwb3J0cy5jb21wYWN0U3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCl7XG4gICAgICAgICAgcmV0dXJuIGV4cG9ydHMuc3RyaW5naWZ5KHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgNjApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFB1YmxpYzogUGFyc2VzIGEgSlNPTiBzb3VyY2Ugc3RyaW5nLlxuICAgICAgaWYgKCFoYXMoXCJqc29uLXBhcnNlXCIpKSB7XG4gICAgICAgIHZhciBmcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgdW5lc2NhcGVkXG4gICAgICAgIC8vIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgVW5lc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcIixcbiAgICAgICAgICAzNDogJ1wiJyxcbiAgICAgICAgICA0NzogXCIvXCIsXG4gICAgICAgICAgOTg6IFwiXFxiXCIsXG4gICAgICAgICAgMTE2OiBcIlxcdFwiLFxuICAgICAgICAgIDExMDogXCJcXG5cIixcbiAgICAgICAgICAxMDI6IFwiXFxmXCIsXG4gICAgICAgICAgMTE0OiBcIlxcclwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFN0b3JlcyB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICB2YXIgSW5kZXgsIFNvdXJjZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVzZXRzIHRoZSBwYXJzZXIgc3RhdGUgYW5kIHRocm93cyBhIGBTeW50YXhFcnJvcmAuXG4gICAgICAgIHZhciBhYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgdGhyb3cgU3ludGF4RXJyb3IoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmV0dXJucyB0aGUgbmV4dCB0b2tlbiwgb3IgYFwiJFwiYCBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkXG4gICAgICAgIC8vIHRoZSBlbmQgb2YgdGhlIHNvdXJjZSBzdHJpbmcuIEEgdG9rZW4gbWF5IGJlIGEgc3RyaW5nLCBudW1iZXIsIGBudWxsYFxuICAgICAgICAvLyBsaXRlcmFsLCBvciBCb29sZWFuIGxpdGVyYWwuXG4gICAgICAgIHZhciBsZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IFNvdXJjZSwgbGVuZ3RoID0gc291cmNlLmxlbmd0aCwgdmFsdWUsIGJlZ2luLCBwb3NpdGlvbiwgaXNTaWduZWQsIGNoYXJDb2RlO1xuICAgICAgICAgIHdoaWxlIChJbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMzogY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAvLyBTa2lwIHdoaXRlc3BhY2UgdG9rZW5zLCBpbmNsdWRpbmcgdGFicywgY2FycmlhZ2UgcmV0dXJucywgbGluZVxuICAgICAgICAgICAgICAgIC8vIGZlZWRzLCBhbmQgc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDEyMzogY2FzZSAxMjU6IGNhc2UgOTE6IGNhc2UgOTM6IGNhc2UgNTg6IGNhc2UgNDQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYSBwdW5jdHVhdG9yIHRva2VuIChge2AsIGB9YCwgYFtgLCBgXWAsIGA6YCwgb3IgYCxgKSBhdFxuICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAgICAgICAgICAgIHZhbHVlID0gY2hhckluZGV4QnVnZ3kgPyBzb3VyY2UuY2hhckF0KEluZGV4KSA6IHNvdXJjZVtJbmRleF07XG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgIGNhc2UgMzQ6XG4gICAgICAgICAgICAgICAgLy8gYFwiYCBkZWxpbWl0cyBhIEpTT04gc3RyaW5nOyBhZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmRcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBwYXJzaW5nIHRoZSBzdHJpbmcuIFN0cmluZyB0b2tlbnMgYXJlIHByZWZpeGVkIHdpdGggdGhlXG4gICAgICAgICAgICAgICAgLy8gc2VudGluZWwgYEBgIGNoYXJhY3RlciB0byBkaXN0aW5ndWlzaCB0aGVtIGZyb20gcHVuY3R1YXRvcnMgYW5kXG4gICAgICAgICAgICAgICAgLy8gZW5kLW9mLXN0cmluZyB0b2tlbnMuXG4gICAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFwiQFwiLCBJbmRleCsrOyBJbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5lc2NhcGVkIEFTQ0lJIGNvbnRyb2wgY2hhcmFjdGVycyAodGhvc2Ugd2l0aCBhIGNvZGUgdW5pdFxuICAgICAgICAgICAgICAgICAgICAvLyBsZXNzIHRoYW4gdGhlIHNwYWNlIGNoYXJhY3RlcikgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlID09IDkyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgcmV2ZXJzZSBzb2xpZHVzIChgXFxgKSBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGFuIGVzY2FwZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gY29udHJvbCBjaGFyYWN0ZXIgKGluY2x1ZGluZyBgXCJgLCBgXFxgLCBhbmQgYC9gKSBvciBVbmljb2RlXG4gICAgICAgICAgICAgICAgICAgIC8vIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgOTI6IGNhc2UgMzQ6IGNhc2UgNDc6IGNhc2UgOTg6IGNhc2UgMTE2OiBjYXNlIDExMDogY2FzZSAxMDI6IGNhc2UgMTE0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gVW5lc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDExNzpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBcXHVgIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYSBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIGZpcnN0IGNoYXJhY3RlciBhbmQgdmFsaWRhdGUgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IGNvZGUgcG9pbnQuXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWdpbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXggKyA0OyBJbmRleCA8IHBvc2l0aW9uOyBJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBIHZhbGlkIHNlcXVlbmNlIGNvbXByaXNlcyBmb3VyIGhleGRpZ2l0cyAoY2FzZS1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5zZW5zaXRpdmUpIHRoYXQgZm9ybSBhIHNpbmdsZSBoZXhhZGVjaW1hbCB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcgfHwgY2hhckNvZGUgPj0gOTcgJiYgY2hhckNvZGUgPD0gMTAyIHx8IGNoYXJDb2RlID49IDY1ICYmIGNoYXJDb2RlIDw9IDcwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IGZyb21DaGFyQ29kZShcIjB4XCIgKyBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBBbiB1bmVzY2FwZWQgZG91YmxlLXF1b3RlIGNoYXJhY3RlciBtYXJrcyB0aGUgZW5kIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW1pemUgZm9yIHRoZSBjb21tb24gY2FzZSB3aGVyZSBhIHN0cmluZyBpcyB2YWxpZC5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJDb2RlID49IDMyICYmIGNoYXJDb2RlICE9IDkyICYmIGNoYXJDb2RlICE9IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgdGhlIHN0cmluZyBhcy1pcy5cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZCByZXR1cm4gdGhlIHJldml2ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW50ZXJtaW5hdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIG51bWJlcnMgYW5kIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgLy8gQWR2YW5jZSBwYXN0IHRoZSBuZWdhdGl2ZSBzaWduLCBpZiBvbmUgaXMgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYW4gaW50ZWdlciBvciBmbG9hdGluZy1wb2ludCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgemVyb2VzIGFyZSBpbnRlcnByZXRlZCBhcyBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0OCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXggKyAxKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIG9jdGFsIGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGludGVnZXIgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgZm9yICg7IEluZGV4IDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IEluZGV4KyspO1xuICAgICAgICAgICAgICAgICAgLy8gRmxvYXRzIGNhbm5vdCBjb250YWluIGEgbGVhZGluZyBkZWNpbWFsIHBvaW50OyBob3dldmVyLCB0aGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlIGlzIGFscmVhZHkgYWNjb3VudGVkIGZvciBieSB0aGUgcGFyc2VyLlxuICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSA0Nikge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yICg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIHRyYWlsaW5nIGRlY2ltYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgZXhwb25lbnRzLiBUaGUgYGVgIGRlbm90aW5nIHRoZSBleHBvbmVudCBpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZS1pbnNlbnNpdGl2ZS5cbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDEwMSB8fCBjaGFyQ29kZSA9PSA2OSkge1xuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIHBhc3QgdGhlIHNpZ24gZm9sbG93aW5nIHRoZSBleHBvbmVudCwgaWYgb25lIGlzXG4gICAgICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQzIHx8IGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZXhwb25lbnRpYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIGVtcHR5IGV4cG9uZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENvZXJjZSB0aGUgcGFyc2VkIHZhbHVlIHRvIGEgSmF2YVNjcmlwdCBudW1iZXIuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gK3NvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBIG5lZ2F0aXZlIHNpZ24gbWF5IG9ubHkgcHJlY2VkZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGlmIChpc1NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYHRydWVgLCBgZmFsc2VgLCBhbmQgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA1KSA9PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDU7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJudWxsXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW5yZWNvZ25pemVkIHRva2VuLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJldHVybiB0aGUgc2VudGluZWwgYCRgIGNoYXJhY3RlciBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkIHRoZSBlbmRcbiAgICAgICAgICAvLyBvZiB0aGUgc291cmNlIHN0cmluZy5cbiAgICAgICAgICByZXR1cm4gXCIkXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFBhcnNlcyBhIEpTT04gYHZhbHVlYCB0b2tlbi5cbiAgICAgICAgdmFyIGdldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHRzLCBoYXNNZW1iZXJzO1xuICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIiRcIikge1xuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICgoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgPT0gXCJAXCIpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZW50aW5lbCBgQGAgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQYXJzZSBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzLlxuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiW1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gYXJyYXksIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IGFycmF5LlxuICAgICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgbWFya3MgdGhlIGVuZCBvZiB0aGUgYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYXJyYXkgbGl0ZXJhbCBjb250YWlucyBlbGVtZW50cywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0aW5nIHRoZSBwcmV2aW91cyBlbGVtZW50IGZyb20gdGhlXG4gICAgICAgICAgICAgICAgLy8gbmV4dC5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIGFycmF5IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEVsaXNpb25zIGFuZCBsZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChnZXQodmFsdWUpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT0gXCJ7XCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBvYmplY3QsIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIGN1cmx5IGJyYWNlIG1hcmtzIHRoZSBlbmQgb2YgdGhlIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvYmplY3QgbGl0ZXJhbCBjb250YWlucyBtZW1iZXJzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRvci5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBvYmplY3QgbWVtYmVyLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZCwgb2JqZWN0IHByb3BlcnR5IG5hbWVzIG11c3QgYmVcbiAgICAgICAgICAgICAgICAvLyBkb3VibGUtcXVvdGVkIHN0cmluZ3MsIGFuZCBhIGA6YCBtdXN0IHNlcGFyYXRlIGVhY2ggcHJvcGVydHlcbiAgICAgICAgICAgICAgICAvLyBuYW1lIGFuZCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIgfHwgdHlwZW9mIHZhbHVlICE9IFwic3RyaW5nXCIgfHwgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pICE9IFwiQFwiIHx8IGxleCgpICE9IFwiOlwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzW3ZhbHVlLnNsaWNlKDEpXSA9IGdldChsZXgoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRva2VuIGVuY291bnRlcmVkLlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBVcGRhdGVzIGEgdHJhdmVyc2VkIG9iamVjdCBtZW1iZXIuXG4gICAgICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgZWxlbWVudCA9IHdhbGsoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgIGlmIChlbGVtZW50ID09PSB1bmRlZikge1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZVtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdXJjZVtwcm9wZXJ0eV0gPSBlbGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGEgcGFyc2VkIEpTT04gb2JqZWN0LCBpbnZva2luZyB0aGVcbiAgICAgICAgLy8gYGNhbGxiYWNrYCBmdW5jdGlvbiBmb3IgZWFjaCB2YWx1ZS4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFdhbGsoaG9sZGVyLCBuYW1lKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgdmFyIHdhbGsgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBzb3VyY2VbcHJvcGVydHldLCBsZW5ndGg7XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBgZm9yRWFjaGAgY2FuJ3QgYmUgdXNlZCB0byB0cmF2ZXJzZSBhbiBhcnJheSBpbiBPcGVyYSA8PSA4LjU0XG4gICAgICAgICAgICAvLyBiZWNhdXNlIGl0cyBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpbXBsZW1lbnRhdGlvbiByZXR1cm5zIGBmYWxzZWBcbiAgICAgICAgICAgIC8vIGZvciBhcnJheSBpbmRpY2VzIChlLmcuLCBgIVsxLCAyLCAzXS5oYXNPd25Qcm9wZXJ0eShcIjBcIilgKS5cbiAgICAgICAgICAgIGlmIChnZXRDbGFzcy5jYWxsKHZhbHVlKSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIGZvciAobGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIGxlbmd0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChzb3VyY2UsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5wYXJzZWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICBleHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHNvdXJjZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcmVzdWx0LCB2YWx1ZTtcbiAgICAgICAgICBJbmRleCA9IDA7XG4gICAgICAgICAgU291cmNlID0gXCJcIiArIHNvdXJjZTtcbiAgICAgICAgICByZXN1bHQgPSBnZXQobGV4KCkpO1xuICAgICAgICAgIC8vIElmIGEgSlNPTiBzdHJpbmcgY29udGFpbnMgbXVsdGlwbGUgdG9rZW5zLCBpdCBpcyBpbnZhbGlkLlxuICAgICAgICAgIGlmIChsZXgoKSAhPSBcIiRcIikge1xuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVzZXQgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGdldENsYXNzLmNhbGwoY2FsbGJhY2spID09IGZ1bmN0aW9uQ2xhc3MgPyB3YWxrKCh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHJlc3VsdCwgdmFsdWUpLCBcIlwiLCBjYWxsYmFjaykgOiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhwb3J0c1tcInJ1bkluQ29udGV4dFwiXSA9IHJ1bkluQ29udGV4dDtcbiAgICByZXR1cm4gZXhwb3J0cztcbiAgfVxuXG4gIGlmIChmcmVlRXhwb3J0cyAmJiAhaXNMb2FkZXIpIHtcbiAgICAvLyBFeHBvcnQgZm9yIENvbW1vbkpTIGVudmlyb25tZW50cy5cbiAgICBydW5JbkNvbnRleHQocm9vdCwgZnJlZUV4cG9ydHMpO1xuICB9IGVsc2Uge1xuICAgIC8vIEV4cG9ydCBmb3Igd2ViIGJyb3dzZXJzIGFuZCBKYXZhU2NyaXB0IGVuZ2luZXMuXG4gICAgdmFyIG5hdGl2ZUpTT04gPSByb290LkpTT04sXG4gICAgICAgIHByZXZpb3VzSlNPTiA9IHJvb3RbXCJKU09OM1wiXSxcbiAgICAgICAgaXNSZXN0b3JlZCA9IGZhbHNlO1xuXG4gICAgdmFyIEpTT04zID0gcnVuSW5Db250ZXh0KHJvb3QsIChyb290W1wiSlNPTjNcIl0gPSB7XG4gICAgICAvLyBQdWJsaWM6IFJlc3RvcmVzIHRoZSBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgZ2xvYmFsIGBKU09OYCBvYmplY3QgYW5kXG4gICAgICAvLyByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBgSlNPTjNgIG9iamVjdC5cbiAgICAgIFwibm9Db25mbGljdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghaXNSZXN0b3JlZCkge1xuICAgICAgICAgIGlzUmVzdG9yZWQgPSB0cnVlO1xuICAgICAgICAgIHJvb3QuSlNPTiA9IG5hdGl2ZUpTT047XG4gICAgICAgICAgcm9vdFtcIkpTT04zXCJdID0gcHJldmlvdXNKU09OO1xuICAgICAgICAgIG5hdGl2ZUpTT04gPSBwcmV2aW91c0pTT04gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBKU09OMztcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICByb290LkpTT04gPSB7XG4gICAgICBcInBhcnNlXCI6IEpTT04zLnBhcnNlLFxuICAgICAgXCJzdHJpbmdpZnlcIjogSlNPTjMuc3RyaW5naWZ5XG4gICAgfTtcbiAgfVxuXG4gIC8vIEV4cG9ydCBmb3IgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLlxuICBpZiAoaXNMb2FkZXIpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIEpTT04zO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuLyogZ2xvYmFscyB3aW5kb3csIGFuZ3VsYXIgKi9cblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknLCBbXG4gICAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXG4gICAgJ2FuZ3VsYXItZ29vZ2xlLWFuYWx5dGljcydcbiAgXSlcbiAgLmNvbnN0YW50KCdfJywgd2luZG93Ll8pXG4gIC8vIGRhdGFsaWIsIHZlZ2FsaXRlLCB2ZWdhXG4gIC5jb25zdGFudCgnZGwnLCB3aW5kb3cuZGwpXG4gIC5jb25zdGFudCgndmwnLCB3aW5kb3cudmwpXG4gIC5jb25zdGFudCgndmcnLCB3aW5kb3cudmcpXG4gIC8vIG90aGVyIGxpYnJhcmllc1xuICAuY29uc3RhbnQoJ0Jsb2InLCB3aW5kb3cuQmxvYilcbiAgLmNvbnN0YW50KCdVUkwnLCB3aW5kb3cuVVJMKVxuICAuY29uc3RhbnQoJ0Ryb3AnLCB3aW5kb3cuRHJvcClcbiAgLmNvbnN0YW50KCdIZWFwJywgd2luZG93LkhlYXApXG4gIC8vIFVzZSB0aGUgY3VzdG9taXplZCB2ZW5kb3IvanNvbjMtY29tcGFjdHN0cmluZ2lmeVxuICAuY29uc3RhbnQoJ0pTT04zJywgd2luZG93LkpTT04zLm5vQ29uZmxpY3QoKSlcbiAgLy8gY29uc3RhbnRzXG4gIC5jb25zdGFudCgnY29uc3RzJywge1xuICAgIGFkZENvdW50OiB0cnVlLCAvLyBhZGQgY291bnQgZmllbGQgdG8gRGF0YXNldC5kYXRhc2NoZW1hXG4gICAgZGVidWc6IHRydWUsXG4gICAgdXNlVXJsOiB0cnVlLFxuICAgIGxvZ2dpbmc6IHRydWUsXG4gICAgZGVmYXVsdENvbmZpZ1NldDogJ2xhcmdlJyxcbiAgICBhcHBJZDogJ3ZsdWknLFxuICAgIC8vIGVtYmVkZGVkIHBvbGVzdGFyIGFuZCB2b3lhZ2VyIHdpdGgga25vd24gZGF0YVxuICAgIGVtYmVkZGVkRGF0YTogd2luZG93LnZndWlEYXRhIHx8IHVuZGVmaW5lZCxcbiAgICBwcmlvcml0eToge1xuICAgICAgYm9va21hcms6IDAsXG4gICAgICBwb3B1cDogMCxcbiAgICAgIHZpc2xpc3Q6IDEwMDBcbiAgICB9LFxuICAgIG15cmlhUmVzdDogJ2h0dHA6Ly9lYzItNTItMS0zOC0xODIuY29tcHV0ZS0xLmFtYXpvbmF3cy5jb206ODc1MycsXG4gICAgZGVmYXVsdFRpbWVGbjogJ3llYXInLFxuICAgIHR5cGVOYW1lczoge1xuICAgICAgbm9taW5hbDogJ3RleHQnLFxuICAgICAgb3JkaW5hbDogJ3RleHQtb3JkaW5hbCcsXG4gICAgICBxdWFudGl0YXRpdmU6ICdudW1iZXInLFxuICAgICAgdGVtcG9yYWw6ICd0aW1lJyxcbiAgICAgIGdlb2dyYXBoaWM6ICdnZW8nXG4gICAgfVxuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKFwidmx1aVwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJhbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWxlcnQtYm94XFxcIiBuZy1zaG93PVxcXCJBbGVydHMuYWxlcnRzLmxlbmd0aCA+IDBcXFwiPjxkaXYgY2xhc3M9XFxcImFsZXJ0LWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gQWxlcnRzLmFsZXJ0c1xcXCI+e3sgYWxlcnQubXNnIH19IDxhIGNsYXNzPVxcXCJjbG9zZVxcXCIgbmctY2xpY2s9XFxcIkFsZXJ0cy5jbG9zZUFsZXJ0KCRpbmRleClcXFwiPiZ0aW1lczs8L2E+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImJvb2ttYXJrLWxpc3RcXFwiIG5nLWlmPVxcXCJCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlciBjYXJkIG5vLXRvcC1tYXJnaW4gbm8tcmlnaHQtbWFyZ2luXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uIG9uLWNsb3NlPVxcXCJsb2dCb29rbWFya3NDbG9zZWQoKVxcXCI+PC9tb2RhbC1jbG9zZS1idXR0b24+PGgyIGNsYXNzPVxcXCJuby1ib3R0b20tbWFyZ2luXFxcIj5Cb29rbWFya3MgKHt7IEJvb2ttYXJrcy5sZW5ndGggfX0pPC9oMj48YSBuZy1jbGljaz1cXFwiQm9va21hcmtzLmNsZWFyKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaC1vXFxcIj48L2k+IENsZWFyIGFsbDwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmbGV4LWdyb3ctMSBzY3JvbGwteVxcXCI+PGRpdiBuZy1pZj1cXFwiQm9va21hcmtzLmxlbmd0aCA+IDBcXFwiIGNsYXNzPVxcXCJoZmxleCBmbGV4LXdyYXBcXFwiPjx2bC1wbG90LWdyb3VwIG5nLXJlcGVhdD1cXFwiY2hhcnQgaW4gQm9va21hcmtzLmRpY3QgfCBvcmRlck9iamVjdEJ5IDogXFwndGltZUFkZGVkXFwnIDogZmFsc2VcXFwiIGNsYXNzPVxcXCJ3cmFwcGVkLXZsLXBsb3QtZ3JvdXAgY2FyZFxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBmaWVsZC1zZXQ9XFxcImNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWdcXFwiIHNob3ctZXhwYW5kPVxcXCJmYWxzZVxcXCIgYWx3YXlzLXNlbGVjdGVkPVxcXCJ0cnVlXFxcIiBoaWdobGlnaHRlZD1cXFwiaGlnaGxpZ2h0ZWRcXFwiIG92ZXJmbG93PVxcXCJ0cnVlXFxcIiB0b29sdGlwPVxcXCJ0cnVlXFxcIiBwcmlvcml0eT1cXFwiY29uc3RzLnByaW9yaXR5LmJvb2ttYXJrXFxcIj48L3ZsLXBsb3QtZ3JvdXA+PC9kaXY+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QtZW1wdHlcXFwiIG5nLWlmPVxcXCJCb29rbWFya3MubGVuZ3RoID09PSAwXFxcIj5Zb3UgaGF2ZSBubyBib29rbWFya3M8L2Rpdj48L2Rpdj48L21vZGFsPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFkZC1teXJpYS1kYXRhc2V0XFxcIj48cD5TZWxlY3QgYSBkYXRhc2V0IGZyb20gdGhlIE15cmlhIGluc3RhbmNlIGF0IDxpbnB1dCBuZy1tb2RlbD1cXFwibXlyaWFSZXN0VXJsXFxcIj48YnV0dG9uIG5nLWNsaWNrPVxcXCJsb2FkRGF0YXNldHMoXFwnXFwnKVxcXCI+dXBkYXRlPC9idXR0b24+LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQobXlyaWFEYXRhc2V0KVxcXCI+PGRpdj48c2VsZWN0IG5hbWU9XFxcIm15cmlhLWRhdGFzZXRcXFwiIGlkPVxcXCJzZWxlY3QtbXlyaWEtZGF0YXNldFxcXCIgbmctZGlzYWJsZWQ9XFxcImRpc2FibGVkXFxcIiBuZy1tb2RlbD1cXFwibXlyaWFEYXRhc2V0XFxcIiBuZy1vcHRpb25zPVxcXCJvcHRpb25OYW1lKGRhdGFzZXQpIGZvciBkYXRhc2V0IGluIG15cmlhRGF0YXNldHMgdHJhY2sgYnkgZGF0YXNldC5yZWxhdGlvbk5hbWVcXFwiPjxvcHRpb24gdmFsdWU9XFxcIlxcXCI+U2VsZWN0IERhdGFzZXQuLi48L29wdGlvbj48L3NlbGVjdD48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGFzZXQ8L2J1dHRvbj48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFkZC11cmwtZGF0YXNldFxcXCI+PHA+QWRkIHRoZSBuYW1lIG9mIHRoZSBkYXRhc2V0IGFuZCB0aGUgVVJMIHRvIGEgPGI+SlNPTjwvYj4gb3IgPGI+Q1NWPC9iPiAod2l0aCBoZWFkZXIpIGZpbGUuIE1ha2Ugc3VyZSB0aGF0IHRoZSBmb3JtYXR0aW5nIGlzIGNvcnJlY3QgYW5kIGNsZWFuIHRoZSBkYXRhIGJlZm9yZSBhZGRpbmcgaXQuIFRoZSBhZGRlZCBkYXRhc2V0IGlzIG9ubHkgdmlzaWJsZSB0byB5b3UuPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRnJvbVVybChhZGRlZERhdGFzZXQpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LXVybFxcXCI+VVJMPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQudXJsXFxcIiBpZD1cXFwiZGF0YXNldC11cmxcXFwiIHR5cGU9XFxcInVybFxcXCI+PHA+TWFrZSBzdXJlIHRoYXQgeW91IGhvc3QgdGhlIGZpbGUgb24gYSBzZXJ2ZXIgdGhhdCBoYXMgPGNvZGU+QWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luOiAqPC9jb2RlPiBzZXQuPC9wPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiY2hhbmdlLWxvYWRlZC1kYXRhc2V0XFxcIj48ZGl2IG5nLWlmPVxcXCJ1c2VyRGF0YS5sZW5ndGhcXFwiPjxoMz5VcGxvYWRlZCBEYXRhc2V0czwvaDM+PHVsPjxsaSBuZy1yZXBlYXQ9XFxcImRhdGFzZXQgaW4gdXNlckRhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzcGFuIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvc3Bhbj4gPHN0cm9uZyBuZy1pZj1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldCA9PT0gZGF0YXNldFxcXCI+KHNlbGVjdGVkKTwvc3Ryb25nPjwvbGk+PC91bD48L2Rpdj48aDM+RXhwbG9yZSBhIFNhbXBsZSBEYXRhc2V0PC9oMz48dWwgY2xhc3M9XFxcImxvYWRlZC1kYXRhc2V0LWxpc3RcXFwiPjxsaSBuZy1yZXBlYXQ9XFxcImRhdGFzZXQgaW4gc2FtcGxlRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHN0cm9uZyBuZy1pZj1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldCA9PT0gZGF0YXNldFxcXCI+KHNlbGVjdGVkKTwvc3Ryb25nPiA8ZW0gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9lbT48L2xpPjwvdWw+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbFwiLFwiPG1vZGFsIGlkPVxcXCJkYXRhc2V0LW1vZGFsXFxcIiBtYXgtd2lkdGg9XFxcIjgwMHB4XFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1oZWFkZXJcXFwiPjxtb2RhbC1jbG9zZS1idXR0b24+PC9tb2RhbC1jbG9zZS1idXR0b24+PGgyPkFkZCBEYXRhc2V0PC9oMj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1tYWluXFxcIj48dGFic2V0Pjx0YWIgaGVhZGluZz1cXFwiQ2hhbmdlIERhdGFzZXRcXFwiPjxjaGFuZ2UtbG9hZGVkLWRhdGFzZXQ+PC9jaGFuZ2UtbG9hZGVkLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJQYXN0ZSBvciBVcGxvYWQgRGF0YVxcXCI+PHBhc3RlLWRhdGFzZXQ+PC9wYXN0ZS1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBVUkxcXFwiPjxhZGQtdXJsLWRhdGFzZXQ+PC9hZGQtdXJsLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIE15cmlhXFxcIj48YWRkLW15cmlhLWRhdGFzZXQ+PC9hZGQtbXlyaWEtZGF0YXNldD48L3RhYj48L3RhYnNldD48L2Rpdj48L21vZGFsPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmh0bWxcIixcIjxidXR0b24gaWQ9XFxcInNlbGVjdC1kYXRhXFxcIiBjbGFzcz1cXFwic21hbGwtYnV0dG9uIHNlbGVjdC1kYXRhXFxcIiBuZy1jbGljaz1cXFwibG9hZERhdGFzZXQoKTtcXFwiPkNoYW5nZTwvYnV0dG9uPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImRyb3B6b25lXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInBhc3RlLWRhdGFcXFwiPjxmaWxlLWRyb3B6b25lIGRhdGFzZXQ9XFxcImRhdGFzZXRcXFwiIG1heC1maWxlLXNpemU9XFxcIjEwXFxcIiB2YWxpZC1taW1lLXR5cGVzPVxcXCJbdGV4dC9jc3YsIHRleHQvanNvbiwgdGV4dC90c3ZdXFxcIj48ZGl2IGNsYXNzPVxcXCJ1cGxvYWQtZGF0YVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1maWxlXFxcIj5GaWxlPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcImZpbGVcXFwiIGlkPVxcXCJkYXRhc2V0LWZpbGVcXFwiIGFjY2VwdD1cXFwidGV4dC9jc3YsdGV4dC90c3ZcXFwiPjwvZGl2PjxwPlVwbG9hZCBhIENTViwgb3IgcGFzdGUgZGF0YSBpbiA8YSBocmVmPVxcXCJodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db21tYS1zZXBhcmF0ZWRfdmFsdWVzXFxcIj5DU1Y8L2E+IGZvcm1hdCBpbnRvIHRoZSBmaWVsZHMuPC9wPjxkaXYgY2xhc3M9XFxcImRyb3B6b25lLXRhcmdldFxcXCI+PHA+RHJvcCBDU1YgZmlsZSBoZXJlPC9wPjwvZGl2PjwvZGl2Pjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwibmFtZVxcXCIgbmctbW9kZWw9XFxcImRhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PHRleHRhcmVhIG5nLW1vZGVsPVxcXCJkYXRhc2V0LmRhdGFcXFwiIG5nLW1vZGVsLW9wdGlvbnM9XFxcInsgdXBkYXRlT246IFxcJ2RlZmF1bHQgYmx1clxcJywgZGVib3VuY2U6IHsgXFwnZGVmYXVsdFxcJzogMTcsIFxcJ2JsdXJcXCc6IDAgfX1cXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcbiAgICAgIDwvdGV4dGFyZWE+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhPC9idXR0b24+PC9mb3JtPjwvZmlsZS1kcm9wem9uZT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJmaWVsZGluZm8vZmllbGRpbmZvLmh0bWxcIixcIjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1pbmZvXFxcIj48c3BhbiBjbGFzcz1cXFwiaGZsZXggZnVsbC13aWR0aFxcXCIgbmctY2xpY2s9XFxcImNsaWNrZWQoJGV2ZW50KVxcXCI+PHNwYW4gY2xhc3M9XFxcInR5cGUtY2FyZXRcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiAhZGlzYWJsZUNvdW50Q2FyZXQgfHwgZmllbGREZWYuYWdncmVnYXRlIT09XFwnY291bnRcXCd9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93blxcXCIgbmctc2hvdz1cXFwic2hvd0NhcmV0XFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJ0eXBlIGZhIHt7aWNvbn19XFxcIiBuZy1zaG93PVxcXCJzaG93VHlwZVxcXCIgdGl0bGU9XFxcInt7dHlwZU5hbWVzW2ZpZWxkRGVmLnR5cGVdfX1cXFwiPjwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gbmctaWY9XFxcImZ1bmMoZmllbGREZWYpXFxcIiBjbGFzcz1cXFwiZmllbGQtZnVuY1xcXCIgbmctY2xhc3M9XFxcInthbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyBmdW5jKGZpZWxkRGVmKSB9fTwvc3Bhbj48c3BhbiBjbGFzcz1cXFwiZmllbGQtbmFtZVxcXCIgbmctY2xhc3M9XFxcIntoYXNmdW5jOiBmdW5jKGZpZWxkRGVmKSwgYW55OiBmaWVsZERlZi5fYW55fVxcXCI+e3sgZmllbGREZWYuZmllbGQgfCB1bmRlcnNjb3JlMnNwYWNlIH19PC9zcGFuPjwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZT09PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmllbGQtY291bnQgZmllbGQtaW5mby10ZXh0XFxcIj48c3BhbiBjbGFzcz1cXFwiZmllbGQtbmFtZVxcXCI+Q09VTlQ8L3NwYW4+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIHJlbW92ZVxcXCIgbmctc2hvdz1cXFwic2hvd1JlbW92ZVxcXCI+PGEgY2xhc3M9XFxcInJlbW92ZS1maWVsZFxcXCIgbmctY2xpY2s9XFxcInJlbW92ZUFjdGlvbigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L2E+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIGluZm9cXFwiIG5nLXNob3c9XFxcInNob3dJbmZvXFxcIj48aSBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBjb250YWluc1R5cGUoW3ZsVHlwZS5OT01JTkFMLCB2bFR5cGUuT1JESU5BTF0sIGZpZWxkRGVmLnR5cGUpXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+TmFtZTo8L3N0cm9uZz4ge3tmaWVsZERlZi5maWVsZH19PGJyPiA8c3Ryb25nPkNhcmRpbmFsaXR5Ojwvc3Ryb25nPiB7e3N0YXRzLmRpc3RpbmN0IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWluOjwvc3Ryb25nPiB7e3N0YXRzLm1pbn19PGJyPiA8c3Ryb25nPk1heDo8L3N0cm9uZz4ge3tzdGF0cy5tYXh9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT4gPGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgZmllbGREZWYudHlwZSA9PT0gdmxUeXBlLlRFTVBPUkFMXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+TmFtZTo8L3N0cm9uZz4ge3tmaWVsZERlZi5maWVsZH19PGJyPiA8c3Ryb25nPkNhcmRpbmFsaXR5Ojwvc3Ryb25nPiB7e3N0YXRzLmRpc3RpbmN0IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWluOjwvc3Ryb25nPiB7e3N0YXRzLm1pbiB8IGRhdGU6IHNob3J0fX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heCB8IGRhdGU6IHNob3J0fX08YnI+IDxzdHJvbmc+U2FtcGxlOjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXCdzYW1wbGVcXCc+e3tzdGF0cy5zYW1wbGUuam9pbihcXCcsIFxcJyl9fTwvc3Bhbj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+IDxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGZpZWxkRGVmLnR5cGUgPT09IHZsVHlwZS5RVUFOVElUQVRJVkVcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPlN0ZGV2Ojwvc3Ryb25nPiB7e3N0YXRzLnN0ZGV2IHwgbnVtYmVyOjJ9fTxicj4gPHN0cm9uZz5NZWFuOjwvc3Ryb25nPiB7e3N0YXRzLm1lYW4gfCBudW1iZXI6Mn19PGJyPiA8c3Ryb25nPk1lZGlhbjo8L3N0cm9uZz4ge3tzdGF0cy5tZWRpYW4gfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT48aSBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlID09PSBcXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPkNvdW50Ojwvc3Ryb25nPiB7e3N0YXRzLm1heH19IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPjwvc3Bhbj48L3NwYW4+PC9zcGFuPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcIm1vZGFsL21vZGFsLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcIm1vZGFsXFxcIiBuZy1pZj1cXFwiaXNPcGVuXFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC13cmFwcGVyXFxcIiBzdHlsZT1cXFwie3t3cmFwcGVyU3R5bGV9fVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJtb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIj48YSBuZy1jbGljaz1cXFwiY2xvc2VNb2RhbCgpXFxcIiBjbGFzcz1cXFwicmlnaHRcXFwiPkNsb3NlPC9hPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRhYnMvdGFiLmh0bWxcIixcIjxkaXYgbmctaWY9XFxcImFjdGl2ZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0YWJzL3RhYnNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ0YWItY29udGFpbmVyXFxcIj48ZGl2PjxhIGNsYXNzPVxcXCJ0YWJcXFwiIG5nLXJlcGVhdD1cXFwidGFiIGluIHRhYnNldC50YWJzXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2FjdGl2ZVxcJzogdGFiLmFjdGl2ZX1cXFwiIG5nLWNsaWNrPVxcXCJ0YWJzZXQuc2hvd1RhYih0YWIpXFxcIj57e3RhYi5oZWFkaW5nfX08L2E+PC9kaXY+PGRpdiBjbGFzcz1cXFwidGFiLWNvbnRlbnRzXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInZscGxvdC92bHBsb3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdFxcXCIgaWQ9XFxcInZpcy17e3Zpc0lkfX1cXFwiIG5nLWNsYXNzPVxcXCJ7IGZpdDogIWFsd2F5c1Njcm9sbGFibGUgJiYgIW92ZXJmbG93ICYmIChtYXhIZWlnaHQgJiYgKCFoZWlnaHQgfHwgaGVpZ2h0IDw9IG1heEhlaWdodCkpICYmIChtYXhXaWR0aCAmJiAoIXdpZHRoIHx8IHdpZHRoIDw9IG1heFdpZHRoKSksIG92ZXJmbG93OiBhbHdheXNTY3JvbGxhYmxlIHx8IG92ZXJmbG93IHx8IChtYXhIZWlnaHQgJiYgaGVpZ2h0ICYmIGhlaWdodCA+IG1heEhlaWdodCkgfHwgKG1heFdpZHRoICYmIHdpZHRoICYmIHdpZHRoID4gbWF4V2lkdGgpLCBzY3JvbGw6IGFsd2F5c1Njcm9sbGFibGUgfHwgdW5sb2NrZWQgfHwgaG92ZXJGb2N1cyB9XFxcIiBuZy1tb3VzZWRvd249XFxcInVubG9ja2VkPSF0aHVtYm5haWxcXFwiIG5nLW1vdXNldXA9XFxcInVubG9ja2VkPWZhbHNlXFxcIiBuZy1tb3VzZW92ZXI9XFxcIm1vdXNlb3ZlcigpXFxcIiBuZy1tb3VzZW91dD1cXFwibW91c2VvdXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLXRvb2x0aXBcXFwiIG5nLXNob3c9XFxcInRvb2x0aXBBY3RpdmVcXFwiPjx0YWJsZT48dHIgbmctcmVwZWF0PVxcXCJwIGluIGRhdGFcXFwiPjx0ZCBjbGFzcz1cXFwia2V5XFxcIj57e3BbMF19fTwvdGQ+PHRkIGNsYXNzPVxcXCJ2YWx1ZVxcXCI+PGI+e3twWzFdfX08L2I+PC90ZD48L3RyPjwvdGFibGU+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cCB2ZmxleFxcXCI+PGRpdiBuZy1zaG93PVxcXCJzaG93RXhwYW5kIHx8IGZpZWxkU2V0IHx8IHNob3dUcmFuc3Bvc2UgfHwgc2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZCB8fCBzaG93VG9nZ2xlXFxcIiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cC1oZWFkZXIgbm8tc2hyaW5rXFxcIj48ZGl2IGNsYXNzPVxcXCJmaWVsZC1zZXQtaW5mb1xcXCI+PGZpZWxkLWluZm8gbmctcmVwZWF0PVxcXCJmaWVsZERlZiBpbiBmaWVsZFNldFxcXCIgbmctaWY9XFxcImZpZWxkU2V0XFxcIiBmaWVsZC1kZWY9XFxcImZpZWxkRGVmXFxcIiBzaG93LXR5cGU9XFxcInRydWVcXFwiIG5nLWNsYXNzPVxcXCJ7IHNlbGVjdGVkOiBhbHdheXNTZWxlY3RlZCB8fCAoaXNTZWxlY3RlZCAmJiBpc1NlbGVjdGVkKGZpZWxkRGVmLmZpZWxkKSksIHVuc2VsZWN0ZWQ6IGlzU2VsZWN0ZWQgJiYgIWlzU2VsZWN0ZWQoZmllbGREZWYuZmllbGQpLCBoaWdobGlnaHRlZDogKGhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdIH1cXFwiIG5nLW1vdXNlb3Zlcj1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdID0gdHJ1ZVxcXCIgbmctbW91c2VvdXQ9XFxcIihoaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IGZhbHNlXFxcIj48L2ZpZWxkLWluZm8+PC9kaXY+PGRpdiBjbGFzcz1cXFwidG9vbGJveFxcXCI+PGEgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWdcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtd3JlbmNoXFxcIiBuZy1jbGljaz1cXFwic2hDb3BpZWQ9XFwnXFwnOyB2bENvcGllZD1cXCdcXCc7IHZnQ29waWVkPVxcJ1xcJztcXFwiIG5nLW1vdXNlb3Zlcj1cXFwiaW5pdGlhbGl6ZVBvcHVwKCk7XFxcIj48L2k+PC9hPjx2bC1wbG90LWdyb3VwLXBvcHVwIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnICYmIHJlbmRlclBvcHVwXFxcIj48L3ZsLXBsb3QtZ3JvdXAtcG9wdXA+PGEgbmctaWY9XFxcInNob3dNYXJrXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkaXNhYmxlZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWZvbnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWxpbmUtY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWFyZWEtY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWJhci1jaGFydFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtY2lyY2xlLW9cXFwiPjwvaT48L2E+IDxhIG5nLWlmPVxcXCJzaG93TG9nICYmIGNoYXJ0LnZsU3BlYyAmJiBsb2cuc3VwcG9ydChjaGFydC52bFNwZWMsIFxcJ3hcXCcpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcImxvZy50b2dnbGUoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGxvZy5hY3RpdmUoY2hhcnQudmxTcGVjLCBcXCd4XFwnKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXJpZ2h0XFxcIj48L2k+IDxzbWFsbD5Mb2cgWDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd5XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneVxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy11cFxcXCI+PC9pPiA8c21hbGw+TG9nIFk8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dTb3J0ICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVTb3J0LnN1cHBvcnQoY2hhcnQudmxTcGVjLCBEYXRhc2V0LnN0YXRzKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVTb3J0LnRvZ2dsZShjaGFydC52bFNwZWMpXFxcIj48aSBjbGFzcz1cXFwiZmEgc29ydFxcXCIgbmctY2xhc3M9XFxcInRvZ2dsZVNvcnRDbGFzcyhjaGFydC52bFNwZWMpXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Tb3J0PC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RmlsdGVyTnVsbCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlRmlsdGVyTnVsbC5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgRGF0YXNldC5zdGF0cylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlRmlsdGVyTnVsbChjaGFydC52bFNwZWMpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogY2hhcnQudmxTcGVjICYmIGNoYXJ0LnZsU3BlYy5jZmcuZmlsdGVyTnVsbC5PfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWZpbHRlclxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+RmlsdGVyPC9zbWFsbD4gPHNtYWxsPk5VTEw8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dUcmFuc3Bvc2VcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidHJhbnNwb3NlKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1yZWZyZXNoIHRyYW5zcG9zZVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U3dhcCBYL1k8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwiQm9va21hcmtzLnRvZ2dsZShjaGFydClcXFwiIG5nLWNsYXNzPVxcXCJ7ZGlzYWJsZWQ6ICFjaGFydC52bFNwZWMuZW5jb2RpbmcsIGFjdGl2ZTogQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWJvb2ttYXJrXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Cb29rbWFyazwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0V4cGFuZFxcXCIgbmctY2xpY2s9XFxcImV4cGFuZEFjdGlvbigpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYT48L2Rpdj48L2Rpdj48dmwtcGxvdCBjbGFzcz1cXFwiZmxleC1ncm93LTFcXFwiIGRhdGEtZmllbGRzZXQ9XFxcIntmaWVsZFNldC5rZXl9fVxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBkaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBhbHdheXMtc2Nyb2xsYWJsZT1cXFwiYWx3YXlzU2Nyb2xsYWJsZVxcXCIgY29uZmlnLXNldD1cXFwie3tjb25maWdTZXR8fFxcJ3NtYWxsXFwnfX1cXFwiIG1heC1oZWlnaHQ9XFxcIm1heEhlaWdodFxcXCIgbWF4LXdpZHRoPVxcXCJtYXhXaWR0aFxcXCIgb3ZlcmZsb3c9XFxcIm92ZXJmbG93XFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHlcXFwiIHJlc2NhbGU9XFxcInJlc2NhbGVcXFwiIHRodW1ibmFpbD1cXFwidGh1bWJuYWlsXFxcIiB0b29sdGlwPVxcXCJ0b29sdGlwXFxcIj48L3ZsLXBsb3Q+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBwb3B1cC1jb21tYW5kIG5vLXNocmluayBkZXYtdG9vbFxcXCI+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbHM8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJzaENvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LnNob3J0aGFuZFxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZMIHNob3J0aGFuZFxcJywgY2hhcnQuc2hvcnRoYW5kKTsgc2hDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7c2hDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZsPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmxDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC5jbGVhblNwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2EtTGl0ZVxcJywgY2hhcnQuY2xlYW5TcGVjKTsgdmxDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmxDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZnPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmdDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC52Z1NwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2FcXCcsIGNoYXJ0LnZnU3BlYyk7IHZnQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZnQ29waWVkfX08L3NwYW4+PC9kaXY+PGEgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiIG5nLWhyZWY9XFxcInt7IHt0eXBlOlxcJ3ZsXFwnLCBzcGVjOiBjaGFydC5jbGVhblNwZWN9IHwgcmVwb3J0VXJsIH19XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+UmVwb3J0IEJhZCBSZW5kZXI8L2E+IDxhIG5nLWNsaWNrPVxcXCJzaG93RmVhdHVyZT0hc2hvd0ZlYXR1cmVcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj57e2NoYXJ0LnNjb3JlfX08L2E+PGRpdiBuZy1yZXBlYXQ9XFxcImYgaW4gY2hhcnQuc2NvcmVGZWF0dXJlcyB0cmFjayBieSBmLnJlYXNvblxcXCI+W3t7Zi5zY29yZX19XSB7e2YucmVhc29ufX08L2Rpdj48L2Rpdj48L2Rpdj5cIik7fV0pOyIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhbGVydE1lc3NhZ2VzJywgZnVuY3Rpb24oQWxlcnRzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLkFsZXJ0cyA9IEFsZXJ0cztcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnQWxlcnRzJywgZnVuY3Rpb24oJHRpbWVvdXQsIF8pIHtcbiAgICB2YXIgQWxlcnRzID0ge307XG5cbiAgICBBbGVydHMuYWxlcnRzID0gW107XG5cbiAgICBBbGVydHMuYWRkID0gZnVuY3Rpb24obXNnLCBkaXNtaXNzKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IHttc2c6IG1zZ307XG4gICAgICBBbGVydHMuYWxlcnRzLnB1c2gobWVzc2FnZSk7XG4gICAgICBpZiAoZGlzbWlzcykge1xuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSBfLmZpbmRJbmRleChBbGVydHMuYWxlcnRzLCBtZXNzYWdlKTtcbiAgICAgICAgICBBbGVydHMuY2xvc2VBbGVydChpbmRleCk7XG4gICAgICAgIH0sIGRpc21pc3MpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBBbGVydHMuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICBBbGVydHMuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcblxuICAgIHJldHVybiBBbGVydHM7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmJvb2ttYXJrTGlzdFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGJvb2ttYXJrTGlzdFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2Jvb2ttYXJrTGlzdCcsIGZ1bmN0aW9uIChCb29rbWFya3MsIGNvbnN0cywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaGlnaGxpZ2h0ZWQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIC8vIFRoZSBib29rbWFyayBsaXN0IGlzIGRlc2lnbmVkIHRvIHJlbmRlciB3aXRoaW4gYSBtb2RhbCBvdmVybGF5LlxuICAgICAgICAvLyBCZWNhdXNlIG1vZGFsIGNvbnRlbnRzIGFyZSBoaWRkZW4gdmlhIG5nLWlmLCBpZiB0aGlzIGxpbmsgZnVuY3Rpb24gaXNcbiAgICAgICAgLy8gZXhlY3V0aW5nIGl0IGlzIGJlY2F1c2UgdGhlIGRpcmVjdGl2ZSBpcyBiZWluZyBzaG93bi4gTG9nIHRoZSBldmVudDpcbiAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX09QRU4pO1xuICAgICAgICBzY29wZS5sb2dCb29rbWFya3NDbG9zZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQ0xPU0UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2bHVpLkJvb2ttYXJrc1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIEJvb2ttYXJrc1xuICogU2VydmljZSBpbiB0aGUgdmx1aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnQm9va21hcmtzJywgZnVuY3Rpb24oXywgdmwsIGxvY2FsU3RvcmFnZVNlcnZpY2UsIExvZ2dlciwgRGF0YXNldCkge1xuICAgIHZhciBCb29rbWFya3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IHt9O1xuICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgICAgdGhpcy5pc1N1cHBvcnRlZCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuaXNTdXBwb3J0ZWQ7XG4gICAgfTtcblxuICAgIHZhciBwcm90byA9IEJvb2ttYXJrcy5wcm90b3R5cGU7XG5cbiAgICBwcm90by51cGRhdGVMZW5ndGggPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubGVuZ3RoID0gT2JqZWN0LmtleXModGhpcy5kaWN0KS5sZW5ndGg7XG4gICAgfTtcblxuICAgIHByb3RvLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgIGxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0KCdib29rbWFya3MnLCB0aGlzLmRpY3QpO1xuICAgIH07XG5cbiAgICBwcm90by5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCgnYm9va21hcmtzJykgfHwge307XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgIH07XG5cbiAgICBwcm90by5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTEVBUik7XG4gICAgfTtcblxuICAgIHByb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBpZiAodGhpcy5kaWN0W3Nob3J0aGFuZF0pIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoY2hhcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hZGQoY2hhcnQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBwcm90by5hZGQgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgY29uc29sZS5sb2coJ2FkZGluZycsIGNoYXJ0LnZsU3BlYywgc2hvcnRoYW5kKTtcblxuICAgICAgY2hhcnQudGltZUFkZGVkID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcblxuICAgICAgY2hhcnQuc3RhdHMgPSBEYXRhc2V0LnN0YXRzO1xuXG4gICAgICB0aGlzLmRpY3Rbc2hvcnRoYW5kXSA9IF8uY2xvbmVEZWVwKGNoYXJ0KTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0FERCwgc2hvcnRoYW5kKTtcbiAgICB9O1xuXG4gICAgcHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdyZW1vdmluZycsIGNoYXJ0LnZsU3BlYywgc2hvcnRoYW5kKTtcblxuICAgICAgZGVsZXRlIHRoaXMuZGljdFtzaG9ydGhhbmRdO1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfUkVNT1ZFLCBzaG9ydGhhbmQpO1xuICAgIH07XG5cbiAgICBwcm90by5pc0Jvb2ttYXJrZWQgPSBmdW5jdGlvbihzaG9ydGhhbmQpIHtcbiAgICAgIHJldHVybiBzaG9ydGhhbmQgaW4gdGhpcy5kaWN0O1xuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IEJvb2ttYXJrcygpO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VydmljZSBmb3IgdGhlIHNwZWMgY29uZmlnLlxuLy8gV2Uga2VlcCB0aGlzIHNlcGFyYXRlIHNvIHRoYXQgY2hhbmdlcyBhcmUga2VwdCBldmVuIGlmIHRoZSBzcGVjIGNoYW5nZXMuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdDb25maWcnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgQ29uZmlnID0ge307XG5cbiAgICBDb25maWcuZGF0YSA9IHt9O1xuICAgIENvbmZpZy5jb25maWcgPSB7fTtcblxuICAgIENvbmZpZy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmdldERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBDb25maWcuZGF0YTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmxhcmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgd2lkdGg6IDQwMCxcbiAgICAgICAgICBoZWlnaHQ6IDQwMFxuICAgICAgICB9LFxuICAgICAgICBmYWNldDoge1xuICAgICAgICAgIGNlbGw6IHtcbiAgICAgICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDIwMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnNtYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBmYWNldDoge1xuICAgICAgICAgIGNlbGw6IHtcbiAgICAgICAgICAgIHdpZHRoOiAxNTAsXG4gICAgICAgICAgICBoZWlnaHQ6IDE1MFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0LCB0eXBlKSB7XG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudmFsdWVzID0gZGF0YXNldC52YWx1ZXM7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS51cmw7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBDb25maWcuZGF0YS51cmwgPSBkYXRhc2V0LnVybDtcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnZhbHVlcztcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHR5cGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBDb25maWc7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2ZpZWxkSW5mbycsIGZ1bmN0aW9uIChEYXRhc2V0LCBEcm9wLCB2bCwgY29uc3RzLCBfKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc9JyxcbiAgICAgICAgc2hvd1R5cGU6ICc9JyxcbiAgICAgICAgc2hvd0luZm86ICc9JyxcbiAgICAgICAgc2hvd0NhcmV0OiAnPScsXG4gICAgICAgIHBvcHVwQ29udGVudDogJz0nLFxuICAgICAgICBzaG93UmVtb3ZlOiAnPScsXG4gICAgICAgIHJlbW92ZUFjdGlvbjogJyYnLFxuICAgICAgICBhY3Rpb246ICcmJyxcbiAgICAgICAgZGlzYWJsZUNvdW50Q2FyZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBmdW5jc1BvcHVwO1xuICAgICAgICBzY29wZS52bFR5cGUgPSB2bC50eXBlO1xuICAgICAgICBzY29wZS50eXBlTmFtZXMgPSBjb25zdHMudHlwZU5hbWVzO1xuICAgICAgICBzY29wZS5zdGF0cyA9IERhdGFzZXQuc3RhdHNbc2NvcGUuZmllbGREZWYuZmllbGRdO1xuICAgICAgICBzY29wZS5jb250YWluc1R5cGUgPSBmdW5jdGlvbih0eXBlcywgdHlwZSkge1xuICAgICAgICAgIHJldHVybiBfLmluY2x1ZGVzKHR5cGVzLCB0eXBlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzd2l0Y2goc2NvcGUuZmllbGREZWYudHlwZSl7XG4gICAgICAgICAgY2FzZSB2bC50eXBlLk9SRElOQUw6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ZhLWZvbnQnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSB2bC50eXBlLk5PTUlOQUw6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ZhLWZvbnQnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSB2bC50eXBlLlFVQU5USVRBVElWRTpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnaWNvbi1oYXNoJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgdmwudHlwZS5URU1QT1JBTDpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtY2FsZW5kYXInO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS5jbGlja2VkID0gZnVuY3Rpb24oJGV2ZW50KXtcbiAgICAgICAgICBpZihzY29wZS5hY3Rpb24gJiYgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCcuZmEtY2FyZXQtZG93bicpWzBdICYmXG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJ3NwYW4udHlwZScpWzBdKSB7XG4gICAgICAgICAgICBzY29wZS5hY3Rpb24oJGV2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLmFnZ3JlZ2F0ZSB8fCBmaWVsZERlZi50aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkRGVmLmJpbiAmJiAnYmluJykgfHxcbiAgICAgICAgICAgIGZpZWxkRGVmLl9hZ2dyZWdhdGUgfHwgZmllbGREZWYuX3RpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuX2JpbiAmJiAnYmluJykgfHwgKGZpZWxkRGVmLl9hbnkgJiYgJ2F1dG8nKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ3BvcHVwQ29udGVudCcsIGZ1bmN0aW9uKHBvcHVwQ29udGVudCkge1xuICAgICAgICAgIGlmICghcG9wdXBDb250ZW50KSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXApIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmNzUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgICBjb250ZW50OiBwb3B1cENvbnRlbnQsXG4gICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnR5cGUtY2FyZXQnKVswXSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxuICAgICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRNeXJpYURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRNeXJpYURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRNeXJpYURhdGFzZXQnLCBmdW5jdGlvbiAoJGh0dHAsIERhdGFzZXQsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5teXJpYVJlc3RVcmwgPSBjb25zdHMubXlyaWFSZXN0O1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gW107XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzID0gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC9zZWFyY2gvP3E9JyArIHF1ZXJ5KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBMb2FkIHRoZSBhdmFpbGFibGUgZGF0YXNldHMgZnJvbSBNeXJpYVxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMoJycpO1xuXG4gICAgICAgIHNjb3BlLm9wdGlvbk5hbWUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQudXNlck5hbWUgKyAnOicgKyBkYXRhc2V0LnByb2dyYW1OYW1lICsgJzonICsgZGF0YXNldC5yZWxhdGlvbk5hbWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKG15cmlhRGF0YXNldCkge1xuICAgICAgICAgIHZhciBkYXRhc2V0ID0ge1xuICAgICAgICAgICAgZ3JvdXA6ICdteXJpYScsXG4gICAgICAgICAgICBuYW1lOiBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lLFxuICAgICAgICAgICAgdXJsOiBzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvdXNlci0nICsgbXlyaWFEYXRhc2V0LnVzZXJOYW1lICtcbiAgICAgICAgICAgICAgJy9wcm9ncmFtLScgKyBteXJpYURhdGFzZXQucHJvZ3JhbU5hbWUgK1xuICAgICAgICAgICAgICAnL3JlbGF0aW9uLScgKyBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lICsgJy9kYXRhP2Zvcm1hdD1qc29uJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRVcmxEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkVXJsRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZFVybERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgZGF0YXNldCB0byBhZGRcbiAgICAgICAgc2NvcGUuYWRkZWREYXRhc2V0ID0ge1xuICAgICAgICAgIGdyb3VwOiAndXNlcidcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGRGcm9tVXJsID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19VUkwsIGRhdGFzZXQudXJsKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gRmV0Y2ggJiBhY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmluR3JvdXBcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGluR3JvdXBcbiAqIEdldCBkYXRhc2V0cyBpbiBhIHBhcnRpY3VsYXIgZ3JvdXBcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YXNldEdyb3VwIE9uZSBvZiBcInNhbXBsZSxcIiBcInVzZXJcIiwgb3IgXCJteXJpYVwiXG4gKiBAcmV0dXJuIHtBcnJheX0gQW4gYXJyYXkgb2YgZGF0YXNldHMgaW4gdGhlIHNwZWNpZmllZCBncm91cFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2luR3JvdXAnLCBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgZGF0YXNldEdyb3VwKSB7XG4gICAgICByZXR1cm4gXy53aGVyZShhcnIsIHtcbiAgICAgICAgZ3JvdXA6IGRhdGFzZXRHcm91cFxuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Y2hhbmdlTG9hZGVkRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGNoYW5nZUxvYWRlZERhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdjaGFuZ2VMb2FkZWREYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIF8pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4cG9zZSBkYXRhc2V0IG9iamVjdCBpdHNlbGYgc28gY3VycmVudCBkYXRhc2V0IGNhbiBiZSBtYXJrZWRcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQuZ3JvdXAgIT09ICdzYW1wbGUnO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5zYW1wbGVEYXRhID0gXy53aGVyZShEYXRhc2V0LmRhdGFzZXRzLCB7XG4gICAgICAgICAgZ3JvdXA6ICdzYW1wbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gRGF0YXNldC5kYXRhc2V0cy5sZW5ndGg7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFzZXQuZ3JvdXAgIT09ICdzYW1wbGUnO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5zZWxlY3REYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoZGF0YXNldCk7XG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBnZXROYW1lTWFwKGRhdGFzY2hlbWEpIHtcbiAgcmV0dXJuIGRhdGFzY2hlbWEucmVkdWNlKGZ1bmN0aW9uKG0sIGZpZWxkRGVmKSB7XG4gICAgbVtmaWVsZERlZi5maWVsZF0gPSBmaWVsZERlZjtcbiAgICByZXR1cm4gbTtcbiAgfSwge30pO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdEYXRhc2V0JywgZnVuY3Rpb24oJGh0dHAsICRxLCBBbGVydHMsIF8sIGRsLCB2bCwgU2FtcGxlRGF0YSwgQ29uZmlnLCBMb2dnZXIpIHtcbiAgICB2YXIgRGF0YXNldCA9IHt9O1xuXG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBzYW1wbGUgZGF0YXNldHNcbiAgICB2YXIgZGF0YXNldHMgPSBTYW1wbGVEYXRhO1xuXG4gICAgRGF0YXNldC5kYXRhc2V0cyA9IGRhdGFzZXRzO1xuICAgIERhdGFzZXQuZGF0YXNldCA9IGRhdGFzZXRzWzFdO1xuICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSB1bmRlZmluZWQ7ICAvLyBkYXRhc2V0IGJlZm9yZSB1cGRhdGVcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBbXTtcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEuYnlOYW1lID0ge307XG4gICAgRGF0YXNldC5zdGF0cyA9IHt9O1xuICAgIERhdGFzZXQudHlwZSA9IHVuZGVmaW5lZDtcblxuICAgIHZhciB0eXBlT3JkZXIgPSB7XG4gICAgICBub21pbmFsOiAwLFxuICAgICAgb3JkaW5hbDogMCxcbiAgICAgIGdlb2dyYXBoaWM6IDIsXG4gICAgICB0ZW1wb3JhbDogMyxcbiAgICAgIHF1YW50aXRhdGl2ZTogNFxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeSA9IHt9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlPT09J2NvdW50JykgcmV0dXJuIDQ7XG4gICAgICByZXR1cm4gdHlwZU9yZGVyW2ZpZWxkRGVmLnR5cGVdO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgcmV0dXJuIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGUoZmllbGREZWYpICsgJ18nICtcbiAgICAgICAgKGZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JyA/ICd+JyA6IGZpZWxkRGVmLmZpZWxkLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAvLyB+IGlzIHRoZSBsYXN0IGNoYXJhY3RlciBpbiBBU0NJSVxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5vcmlnaW5hbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIDA7IC8vIG5vIHN3YXAgd2lsbCBvY2N1clxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gZmllbGREZWYuZmllbGQ7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmNhcmRpbmFsaXR5ID0gZnVuY3Rpb24oZmllbGREZWYsIHN0YXRzKSB7XG4gICAgICByZXR1cm4gc3RhdHNbZmllbGREZWYuZmllbGRdLmRpc3RpbmN0O1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXIgPSBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWU7XG5cbiAgICBEYXRhc2V0LmdldFNjaGVtYSA9IGZ1bmN0aW9uKGRhdGEsIHN0YXRzLCBvcmRlcikge1xuICAgICAgdmFyIHR5cGVzID0gZGwudHlwZS5pbmZlckFsbChkYXRhKSxcbiAgICAgICAgc2NoZW1hID0gXy5yZWR1Y2UodHlwZXMsIGZ1bmN0aW9uKHMsIHR5cGUsIGZpZWxkKSB7XG4gICAgICAgICAgdmFyIGZpZWxkRGVmID0ge1xuICAgICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgdHlwZTogdmwuZGF0YS50eXBlc1t0eXBlXSxcbiAgICAgICAgICAgIHByaW1pdGl2ZVR5cGU6IHR5cGVcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKGZpZWxkRGVmLnR5cGUgPT09IHZsLnR5cGUuUVVBTlRJVEFUSVZFICYmIHN0YXRzW2ZpZWxkRGVmLmZpZWxkXS5kaXN0aW5jdCA8PSA1KSB7XG4gICAgICAgICAgICBmaWVsZERlZi50eXBlID0gdmwudHlwZS5PUkRJTkFMO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHMucHVzaChmaWVsZERlZik7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH0sIFtdKTtcblxuICAgICAgc2NoZW1hID0gZGwuc3RhYmxlc29ydChzY2hlbWEsIG9yZGVyIHx8IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSwgRGF0YXNldC5maWVsZE9yZGVyQnkuZmllbGQpO1xuXG4gICAgICBzY2hlbWEucHVzaCh2bC5maWVsZERlZi5jb3VudCgpKTtcbiAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgc2NoZW1hIGFuZCBzdGF0c1xuICAgIERhdGFzZXQub25VcGRhdGUgPSBbXTtcblxuICAgIERhdGFzZXQudXBkYXRlID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgdmFyIHVwZGF0ZVByb21pc2U7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX0NIQU5HRSwgZGF0YXNldC5uYW1lKTtcblxuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gICAgICAgICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YXNldC52YWx1ZXMpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJGh0dHAuZ2V0KGRhdGFzZXQudXJsLCB7Y2FjaGU6IHRydWV9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgICAvLyBmaXJzdCBzZWUgd2hldGhlciB0aGUgZGF0YSBpcyBKU09OLCBvdGhlcndpc2UgdHJ5IHRvIHBhcnNlIENTVlxuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGwucmVhZChyZXNwb25zZS5kYXRhLCB7dHlwZTogJ2Nzdid9KTtcbiAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdjc3YnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBEYXRhc2V0Lm9uVXBkYXRlLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9IHVwZGF0ZVByb21pc2UudGhlbihsaXN0ZW5lcik7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ29weSB0aGUgZGF0YXNldCBpbnRvIHRoZSBjb25maWcgc2VydmljZSBvbmNlIGl0IGlzIHJlYWR5XG4gICAgICB1cGRhdGVQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbmZpZy51cGRhdGVEYXRhc2V0KGRhdGFzZXQsIERhdGFzZXQudHlwZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHVwZGF0ZVByb21pc2U7XG4gICAgfTtcblxuICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEgPSBmdW5jdGlvbihkYXRhc2V0LCBkYXRhKSB7XG4gICAgICBEYXRhc2V0LmRhdGEgPSBkYXRhO1xuXG4gICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgIERhdGFzZXQuc3RhdHMgPSBkbC5zdW1tYXJ5KGRhdGEpLnJlZHVjZShmdW5jdGlvbihzLCBwcm9maWxlKSB7XG4gICAgICAgIHNbcHJvZmlsZS5maWVsZF0gPSBwcm9maWxlO1xuICAgICAgICByZXR1cm4gcztcbiAgICAgIH0sIHtcbiAgICAgICAgJyonOiB7XG4gICAgICAgICAgbWF4OiBkYXRhLmxlbmd0aCxcbiAgICAgICAgICBtaW46IDBcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGZvciAodmFyIGZpZWxkTmFtZSBpbiBEYXRhc2V0LnN0YXRzKSB7XG4gICAgICAgIGlmIChmaWVsZE5hbWUgIT09ICcqJykge1xuICAgICAgICAgIERhdGFzZXQuc3RhdHNbZmllbGROYW1lXS5zYW1wbGUgPSBfLnNhbXBsZShfLm1hcChEYXRhc2V0LmRhdGEsIGZpZWxkTmFtZSksIDcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYSA9IERhdGFzZXQuZ2V0U2NoZW1hKERhdGFzZXQuZGF0YSwgRGF0YXNldC5zdGF0cyk7XG4gICAgICBEYXRhc2V0LmRhdGFzY2hlbWEuYnlOYW1lID0gZ2V0TmFtZU1hcChEYXRhc2V0LmRhdGFzY2hlbWEpO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmFkZCA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgIGlmICghZGF0YXNldC5pZCkge1xuICAgICAgICBkYXRhc2V0LmlkID0gZGF0YXNldC51cmw7XG4gICAgICB9XG4gICAgICBkYXRhc2V0cy5wdXNoKGRhdGFzZXQpO1xuXG4gICAgICByZXR1cm4gZGF0YXNldDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERhdGFzZXQ7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmRhdGFzZXRNb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGRhdGFzZXRNb2RhbFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRNb2RhbCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZTogZmFsc2VcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdkYXRhc2V0U2VsZWN0b3InLCBmdW5jdGlvbihNb2RhbHMsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge30sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZS8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfT1BFTik7XG4gICAgICAgICAgTW9kYWxzLm9wZW4oJ2RhdGFzZXQtbW9kYWwnKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWxlRHJvcHpvbmVcbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWxlRHJvcHpvbmVcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAvLyBBZGQgdGhlIGZpbGUgcmVhZGVyIGFzIGEgbmFtZWQgZGVwZW5kZW5jeVxuICAuY29uc3RhbnQoJ0ZpbGVSZWFkZXInLCB3aW5kb3cuRmlsZVJlYWRlcilcbiAgLmRpcmVjdGl2ZSgnZmlsZURyb3B6b25lJywgZnVuY3Rpb24gKE1vZGFscywgQWxlcnRzLCBGaWxlUmVhZGVyKSB7XG5cbiAgICAvLyBIZWxwZXIgbWV0aG9kc1xuXG4gICAgZnVuY3Rpb24gaXNTaXplVmFsaWQoc2l6ZSwgbWF4U2l6ZSkge1xuICAgICAgLy8gU2l6ZSBpcyBwcm92aWRlZCBpbiBieXRlczsgbWF4U2l6ZSBpcyBwcm92aWRlZCBpbiBtZWdhYnl0ZXNcbiAgICAgIC8vIENvZXJjZSBtYXhTaXplIHRvIGEgbnVtYmVyIGluIGNhc2UgaXQgY29tZXMgaW4gYXMgYSBzdHJpbmcsXG4gICAgICAvLyAmIHJldHVybiB0cnVlIHdoZW4gbWF4IGZpbGUgc2l6ZSB3YXMgbm90IHNwZWNpZmllZCwgaXMgZW1wdHksXG4gICAgICAvLyBvciBpcyBzdWZmaWNpZW50bHkgbGFyZ2VcbiAgICAgIHJldHVybiAhbWF4U2l6ZSB8fCAoIHNpemUgLyAxMDI0IC8gMTAyNCA8ICttYXhTaXplICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNUeXBlVmFsaWQodHlwZSwgdmFsaWRNaW1lVHlwZXMpIHtcbiAgICAgICAgLy8gSWYgbm8gbWltZSB0eXBlIHJlc3RyaWN0aW9ucyB3ZXJlIHByb3ZpZGVkLCBvciB0aGUgcHJvdmlkZWQgZmlsZSdzXG4gICAgICAgIC8vIHR5cGUgaXMgd2hpdGVsaXN0ZWQsIHR5cGUgaXMgdmFsaWRcbiAgICAgIHJldHVybiAhdmFsaWRNaW1lVHlwZXMgfHwgKCB2YWxpZE1pbWVUeXBlcy5pbmRleE9mKHR5cGUpID4gLTEgKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgLy8gUGVybWl0IGFyYml0cmFyeSBjaGlsZCBjb250ZW50XG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgbWF4RmlsZVNpemU6ICdAJyxcbiAgICAgICAgdmFsaWRNaW1lVHlwZXM6ICdAJyxcbiAgICAgICAgLy8gRXhwb3NlIHRoaXMgZGlyZWN0aXZlJ3MgZGF0YXNldCBwcm9wZXJ0eSB0byBwYXJlbnQgc2NvcGVzIHRocm91Z2hcbiAgICAgICAgLy8gdHdvLXdheSBkYXRhYmluZGluZ1xuICAgICAgICBkYXRhc2V0OiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQvKiwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0gc2NvcGUuZGF0YXNldCB8fCB7fTtcblxuICAgICAgICBlbGVtZW50Lm9uKCdkcmFnb3ZlciBkcmFnZW50ZXInLCBmdW5jdGlvbiBvbkRyYWdFbnRlcihldmVudCkge1xuICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdjb3B5JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZEZpbGUoZmlsZSkge1xuICAgICAgICAgIGlmICghaXNUeXBlVmFsaWQoZmlsZS50eXBlLCBzY29wZS52YWxpZE1pbWVUeXBlcykpIHtcbiAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgQWxlcnRzLmFkZCgnSW52YWxpZCBmaWxlIHR5cGUuIEZpbGUgbXVzdCBiZSBvbmUgb2YgZm9sbG93aW5nIHR5cGVzOiAnICsgc2NvcGUudmFsaWRNaW1lVHlwZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaXNTaXplVmFsaWQoZmlsZS5zaXplLCBzY29wZS5tYXhGaWxlU2l6ZSkpIHtcbiAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgQWxlcnRzLmFkZCgnRmlsZSBtdXN0IGJlIHNtYWxsZXIgdGhhbiAnICsgc2NvcGUubWF4RmlsZVNpemUgKyAnIE1CJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmRhdGFzZXQuZGF0YSA9IGV2dC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgICAvLyBTdHJpcCBmaWxlIG5hbWUgZXh0ZW5zaW9ucyBmcm9tIHRoZSB1cGxvYWRlZCBkYXRhXG4gICAgICAgICAgICAgIHNjb3BlLmRhdGFzZXQubmFtZSA9IGZpbGUubmFtZS5yZXBsYWNlKC9cXC5cXHcrJC8sICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgQWxlcnRzLmFkZCgnRXJyb3IgcmVhZGluZyBmaWxlJyk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudC5vbignZHJvcCcsIGZ1bmN0aW9uIG9uRHJvcChldmVudCkge1xuICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZWFkRmlsZShldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5maWxlc1swXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGVsZW1lbnQuZmluZCgnaW5wdXRbdHlwZT1cImZpbGVcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24gb25VcGxvYWQoLypldmVudCovKSB7XG4gICAgICAgICAgLy8gXCJ0aGlzXCIgaXMgdGhlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICByZWFkRmlsZSh0aGlzLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpwYXN0ZURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBwYXN0ZURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdwYXN0ZURhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyLCBDb25maWcsIF8sIGRsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9wYXN0ZWRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2NvcGUgdmFyaWFibGVzXG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSB7XG4gICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgZGF0YTogJydcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkbC5yZWFkKHNjb3BlLmRhdGFzZXQuZGF0YSwge1xuICAgICAgICAgICAgdHlwZTogJ2NzdidcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBwYXN0ZWREYXRhc2V0ID0ge1xuICAgICAgICAgICAgaWQ6IERhdGUubm93KCksICAvLyB0aW1lIGFzIGlkXG4gICAgICAgICAgICBuYW1lOiBzY29wZS5kYXRhc2V0Lm5hbWUsXG4gICAgICAgICAgICB2YWx1ZXM6IGRhdGEsXG4gICAgICAgICAgICBncm91cDogJ3Bhc3RlZCdcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gTG9nIHRoYXQgd2UgaGF2ZSBwYXN0ZWQgZGF0YVxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19QQVNURSwgcGFzdGVkRGF0YXNldC5uYW1lKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBwYXN0ZWQgZGF0YSBhcyBhIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQocGFzdGVkRGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIC8vIENsb3NlIHRoaXMgZGlyZWN0aXZlJ3MgY29udGFpbmluZyBtb2RhbFxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCd2bHVpJykuY29uc3RhbnQoJ1NhbXBsZURhdGEnLCBbe1xuICBuYW1lOiAnQmFybGV5JyxcbiAgZGVzY3JpcHRpb246ICdCYXJsZXkgeWllbGQgYnkgdmFyaWV0eSBhY3Jvc3MgdGhlIHVwcGVyIG1pZHdlc3QgaW4gMTkzMSBhbmQgMTkzMicsXG4gIHVybDogJ2RhdGEvYmFybGV5Lmpzb24nLFxuICBpZDogJ2JhcmxleScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYXJzJyxcbiAgZGVzY3JpcHRpb246ICdBdXRvbW90aXZlIHN0YXRpc3RpY3MgZm9yIGEgdmFyaWV0eSBvZiBjYXIgbW9kZWxzIGJldHdlZW4gMTk3MCAmIDE5ODInLFxuICB1cmw6ICdkYXRhL2NhcnMuanNvbicsXG4gIGlkOiAnY2FycycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDcmltZWEnLFxuICB1cmw6ICdkYXRhL2NyaW1lYS5qc29uJyxcbiAgaWQ6ICdjcmltZWEnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnRHJpdmluZycsXG4gIHVybDogJ2RhdGEvZHJpdmluZy5qc29uJyxcbiAgaWQ6ICdkcml2aW5nJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0lyaXMnLFxuICB1cmw6ICdkYXRhL2lyaXMuanNvbicsXG4gIGlkOiAnaXJpcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdKb2JzJyxcbiAgdXJsOiAnZGF0YS9qb2JzLmpzb24nLFxuICBpZDogJ2pvYnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnUG9wdWxhdGlvbicsXG4gIHVybDogJ2RhdGEvcG9wdWxhdGlvbi5qc29uJyxcbiAgaWQ6ICdwb3B1bGF0aW9uJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ01vdmllcycsXG4gIHVybDogJ2RhdGEvbW92aWVzLmpzb24nLFxuICBpZDogJ21vdmllcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCaXJkc3RyaWtlcycsXG4gIHVybDogJ2RhdGEvYmlyZHN0cmlrZXMuanNvbicsXG4gIGlkOiAnYmlyZHN0cmlrZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQnVydGluJyxcbiAgdXJsOiAnZGF0YS9idXJ0aW4uanNvbicsXG4gIGlkOiAnYnVydGluJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhbXBhaWducycsXG4gIHVybDogJ2RhdGEvd2ViYWxsMjYuanNvbicsXG4gIGlkOiAnd2ViYWxsMjYnLFxuICBncm91cDogJ3NhbXBsZSdcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmxvZ2dlclxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGxvZ2dlclxuICogU2VydmljZSBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdMb2dnZXInLCBmdW5jdGlvbiAoJGxvY2F0aW9uLCAkd2luZG93LCBjb25zdHMsIEFuYWx5dGljcykge1xuXG4gICAgdmFyIHNlcnZpY2UgPSB7fTtcblxuICAgIHNlcnZpY2UubGV2ZWxzID0ge1xuICAgICAgT0ZGOiB7aWQ6J09GRicsIHJhbms6MH0sXG4gICAgICBUUkFDRToge2lkOidUUkFDRScsIHJhbms6MX0sXG4gICAgICBERUJVRzoge2lkOidERUJVRycsIHJhbms6Mn0sXG4gICAgICBJTkZPOiB7aWQ6J0lORk8nLCByYW5rOjN9LFxuICAgICAgV0FSTjoge2lkOidXQVJOJywgcmFuazo0fSxcbiAgICAgIEVSUk9SOiB7aWQ6J0VSUk9SJywgcmFuazo1fSxcbiAgICAgIEZBVEFMOiB7aWQ6J0ZBVEFMJywgcmFuazo2fVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmFjdGlvbnMgPSB7XG4gICAgICAvLyBEQVRBXG4gICAgICBJTklUSUFMSVpFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdJTklUSUFMSVpFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIFVORE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1VORE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBSRURPOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdSRURPJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9DSEFOR0U6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9PUEVOOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX05FV19QQVNURToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfUEFTVEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX05FV19VUkw6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfTkVXX1VSTCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIEJPT0tNQVJLXG4gICAgICBCT09LTUFSS19BREQ6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0FERCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX1JFTU9WRToge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfUkVNT1ZFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfT1BFTjoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX0NMT1NFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19DTE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX0NMRUFSOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOiAnQk9PS01BUktfQ0xFQVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICAvLyBDSEFSVFxuICAgICAgQ0hBUlRfTU9VU0VPVkVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9NT1VTRU9WRVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfTU9VU0VPVVQ6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1JFTkRFUjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfUkVOREVSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX0VYUE9TRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfRVhQT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1RPT0xUSVA6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1RPT0xUSVAnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUF9FTkQ6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1RPT0xUSVBfRU5EJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcblxuICAgICAgU09SVF9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J1NPUlRfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTUFSS19UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J01BUktfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRFJJTExfRE9XTl9PUEVOOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidEUklMTF9ET1dOX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX0NMT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnRFJJTExfRE9XTl9DTE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIExPR19UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdMT0dfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVFJBTlNQT1NFX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ1RSQU5TUE9TRV9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBOVUxMX0ZJTFRFUl9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J05VTExfRklMVEVSX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgQ0xVU1RFUl9TRUxFQ1Q6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NMVVNURVJfU0VMRUNUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9BRF9NT1JFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidMT0FEX01PUkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEZJRUxEU1xuICAgICAgRklFTERTX0NIQU5HRToge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGSUVMRFNfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERTX1JFU0VUOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19SRVNFVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZVTkNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZVTkNfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvL1BPTEVTVEFSXG4gICAgICBTUEVDX0NIQU5HRToge2NhdGVnb3J5OidQT0xFU1RBUicsIGlkOiAnU1BFQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgRklFTERfRFJPUDoge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ0ZJRUxEX0RST1AnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgTUFSS19DSEFOR0U6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdNQVJLX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR31cbiAgICB9O1xuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbiwgbGFiZWwsIGRhdGEpIHtcbiAgICAgIGlmICghY29uc3RzLmxvZ2dpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIHZhbHVlID0gZGF0YSA/IGRhdGEudmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgICBpZihhY3Rpb24ubGV2ZWwucmFuayA+PSBzZXJ2aWNlLmxldmVscy5JTkZPLnJhbmspIHtcbiAgICAgICAgQW5hbHl0aWNzLnRyYWNrRXZlbnQoYWN0aW9uLmNhdGVnb3J5LCBhY3Rpb24uaWQsIGxhYmVsLCB2YWx1ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbTG9nZ2luZ10gJywgYWN0aW9uLmlkLCBsYWJlbCwgZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24oc2VydmljZS5hY3Rpb25zLklOSVRJQUxJWkUsIGNvbnN0cy5hcHBJZCk7XG5cbiAgICByZXR1cm4gc2VydmljZTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6bW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsJywgZnVuY3Rpb24gKCRkb2N1bWVudCwgTW9kYWxzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnbW9kYWwvbW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGF1dG9PcGVuOiAnPScsXG4gICAgICAgIG1heFdpZHRoOiAnQCdcbiAgICAgIH0sXG4gICAgICAvLyBQcm92aWRlIGFuIGludGVyZmFjZSBmb3IgY2hpbGQgZGlyZWN0aXZlcyB0byBjbG9zZSB0aGlzIG1vZGFsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIG1vZGFsSWQgPSBhdHRycy5pZDtcblxuICAgICAgICBpZiAoc2NvcGUubWF4V2lkdGgpIHtcbiAgICAgICAgICBzY29wZS53cmFwcGVyU3R5bGUgPSAnbWF4LXdpZHRoOicgKyBzY29wZS5tYXhXaWR0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gY2xvc2VkIHVubGVzcyBhdXRvT3BlbiBpcyBzZXRcbiAgICAgICAgc2NvcGUuaXNPcGVuID0gc2NvcGUuYXV0b09wZW47XG5cbiAgICAgICAgLy8gY2xvc2Ugb24gZXNjXG4gICAgICAgIGZ1bmN0aW9uIGVzY2FwZShlKSB7XG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMjcgJiYgc2NvcGUuaXNPcGVuKSB7XG4gICAgICAgICAgICBzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KS5vbigna2V5ZG93bicsIGVzY2FwZSk7XG5cbiAgICAgICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2RhbCB3aXRoIHRoZSBzZXJ2aWNlXG4gICAgICAgIE1vZGFscy5yZWdpc3Rlcihtb2RhbElkLCBzY29wZSk7XG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBNb2RhbHMuZGVyZWdpc3Rlcihtb2RhbElkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6bW9kYWxDbG9zZUJ1dHRvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsQ2xvc2VCdXR0b25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdtb2RhbENsb3NlQnV0dG9uJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl5tb2RhbCcsXG4gICAgICBzY29wZToge1xuICAgICAgICAnY2xvc2VDYWxsYmFjayc6ICcmb25DbG9zZSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICBzY29wZS5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgaWYgKHNjb3BlLmNsb3NlQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIHNjb3BlLmNsb3NlQ2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuTW9kYWxzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgTW9kYWxzXG4gKiBTZXJ2aWNlIHVzZWQgdG8gY29udHJvbCBtb2RhbCB2aXNpYmlsaXR5IGZyb20gYW55d2hlcmUgaW4gdGhlIGFwcGxpY2F0aW9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ01vZGFscycsIGZ1bmN0aW9uICgkY2FjaGVGYWN0b3J5KSB7XG5cbiAgICAvLyBUT0RPOiBUaGUgdXNlIG9mIHNjb3BlIGhlcmUgYXMgdGhlIG1ldGhvZCBieSB3aGljaCBhIG1vZGFsIGRpcmVjdGl2ZVxuICAgIC8vIGlzIHJlZ2lzdGVyZWQgYW5kIGNvbnRyb2xsZWQgbWF5IG5lZWQgdG8gY2hhbmdlIHRvIHN1cHBvcnQgcmV0cmlldmluZ1xuICAgIC8vIGRhdGEgZnJvbSBhIG1vZGFsIGFzIG1heSBiZSBuZWVkZWQgaW4gIzc3XG4gICAgdmFyIG1vZGFsc0NhY2hlID0gJGNhY2hlRmFjdG9yeSgnbW9kYWxzJyk7XG5cbiAgICAvLyBQdWJsaWMgQVBJXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihpZCwgc2NvcGUpIHtcbiAgICAgICAgaWYgKG1vZGFsc0NhY2hlLmdldChpZCkpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdDYW5ub3QgcmVnaXN0ZXIgdHdvIG1vZGFscyB3aXRoIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsc0NhY2hlLnB1dChpZCwgc2NvcGUpO1xuICAgICAgfSxcblxuICAgICAgZGVyZWdpc3RlcjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlKGlkKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIE9wZW4gYSBtb2RhbFxuICAgICAgb3BlbjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSB0cnVlO1xuICAgICAgfSxcblxuICAgICAgLy8gQ2xvc2UgYSBtb2RhbFxuICAgICAgY2xvc2U6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBtb2RhbFNjb3BlID0gbW9kYWxzQ2FjaGUuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFtb2RhbFNjb3BlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5yZWdpc3RlcmVkIG1vZGFsIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsU2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICB9LFxuXG4gICAgICBlbXB0eTogZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGFsc0NhY2hlLnJlbW92ZUFsbCgpO1xuICAgICAgfSxcblxuICAgICAgY291bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kYWxzQ2FjaGUuaW5mbygpLnNpemU7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHNlcnZpbmcgVkwgU2NoZW1hXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdTY2hlbWEnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgU2NoZW1hID0ge307XG5cbiAgICBTY2hlbWEuc2NoZW1hID0gZGwuanNvbignYm93ZXJfY29tcG9uZW50cy92ZWdhLWxpdGUvdmVnYS1saXRlLXNjaGVtYS5qc29uJyk7XG5cbiAgICBTY2hlbWEuZ2V0Q2hhbm5lbFNjaGVtYSA9IGZ1bmN0aW9uKGNoYW5uZWwpIHtcbiAgICAgIHZhciBlbmNvZGluZ0NoYW5uZWxQcm9wID0gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9ucy5FbmNvZGluZy5wcm9wZXJ0aWVzW2NoYW5uZWxdO1xuICAgICAgdmFyIHJlZiA9IGVuY29kaW5nQ2hhbm5lbFByb3AuJHJlZiB8fCBlbmNvZGluZ0NoYW5uZWxQcm9wLm9uZU9mWzBdLiRyZWY7XG4gICAgICB2YXIgZGVmID0gcmVmLnNsaWNlKHJlZi5sYXN0SW5kZXhPZignLycpKzEpO1xuICAgICAgcmV0dXJuIFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnNbZGVmXTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjaGVtYTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFiXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFiXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFiJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndGFicy90YWIuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15edGFic2V0JyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaGVhZGluZzogJ0AnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCB0YWJzZXRDb250cm9sbGVyKSB7XG4gICAgICAgIHRhYnNldENvbnRyb2xsZXIuYWRkVGFiKHNjb3BlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTp0YWJzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyB0YWJzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd0YWJzZXQnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd0YWJzL3RhYnNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuXG4gICAgICAvLyBJbnRlcmZhY2UgZm9yIHRhYnMgdG8gcmVnaXN0ZXIgdGhlbXNlbHZlc1xuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRhYnMgPSBbXTtcblxuICAgICAgICB0aGlzLmFkZFRhYiA9IGZ1bmN0aW9uKHRhYlNjb3BlKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdGFiIGlzIGFsd2F5cyBhdXRvLWFjdGl2YXRlZDsgb3RoZXJzIGF1dG8tZGVhY3RpdmF0ZWRcbiAgICAgICAgICB0YWJTY29wZS5hY3RpdmUgPSBzZWxmLnRhYnMubGVuZ3RoID09PSAwO1xuICAgICAgICAgIHNlbGYudGFicy5wdXNoKHRhYlNjb3BlKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNob3dUYWIgPSBmdW5jdGlvbihzZWxlY3RlZFRhYikge1xuICAgICAgICAgIHNlbGYudGFicy5mb3JFYWNoKGZ1bmN0aW9uKHRhYikge1xuICAgICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIHRhYiwgZGVhY3RpdmF0ZSBhbGwgb3RoZXJzXG4gICAgICAgICAgICB0YWIuYWN0aXZlID0gdGFiID09PSBzZWxlY3RlZFRhYjtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIEV4cG9zZSBjb250cm9sbGVyIHRvIHRlbXBsYXRlcyBhcyBcInRhYnNldFwiXG4gICAgICBjb250cm9sbGVyQXM6ICd0YWJzZXQnXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90JywgZnVuY3Rpb24oZGwsIHZsLCB2ZywgJHRpbWVvdXQsICRxLCBEYXRhc2V0LCBDb25maWcsIGNvbnN0cywgXywgJGRvY3VtZW50LCBMb2dnZXIsIEhlYXAsICR3aW5kb3cpIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIE1BWF9DQU5WQVNfU0laRSA9IDMyNzY3LzIsIE1BWF9DQU5WQVNfQVJFQSA9IDI2ODQzNTQ1Ni80O1xuXG4gICAgdmFyIHJlbmRlclF1ZXVlID0gbmV3IEhlYXAoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIHJldHVybiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eTtcbiAgICAgIH0pLFxuICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBnZXRSZW5kZXJlcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAvLyB1c2UgY2FudmFzIGJ5IGRlZmF1bHQgYnV0IHVzZSBzdmcgaWYgdGhlIHZpc3VhbGl6YXRpb24gaXMgdG9vIGJpZ1xuICAgICAgaWYgKHdpZHRoID4gTUFYX0NBTlZBU19TSVpFIHx8IGhlaWdodCA+IE1BWF9DQU5WQVNfU0laRSB8fCB3aWR0aCpoZWlnaHQgPiBNQVhfQ0FOVkFTX0FSRUEpIHtcbiAgICAgICAgcmV0dXJuICdzdmcnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdjYW52YXMnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdC92bHBsb3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPScsXG4gICAgICAgIGlzSW5MaXN0OiAnPScsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJz0nLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgbWF4SGVpZ2h0Oic9JyxcbiAgICAgICAgbWF4V2lkdGg6ICc9JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc9JyxcbiAgICAgICAgcHJpb3JpdHk6ICc9JyxcbiAgICAgICAgcmVzY2FsZTogJz0nLFxuICAgICAgICB0aHVtYm5haWw6ICc9JyxcbiAgICAgICAgdG9vbHRpcDogJz0nLFxuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgSE9WRVJfVElNRU9VVCA9IDUwMCxcbiAgICAgICAgICBUT09MVElQX1RJTUVPVVQgPSAyNTA7XG5cbiAgICAgICAgc2NvcGUudmlzSWQgPSAoY291bnRlcisrKTtcbiAgICAgICAgc2NvcGUuaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgc2NvcGUudG9vbHRpcFByb21pc2UgPSBudWxsO1xuICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGZvcm1hdCA9IGRsLmZvcm1hdC5udW1iZXIoJycpO1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3ZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmhvdmVyUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfTU9VU0VPVkVSLCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSAhc2NvcGUudGh1bWJuYWlsO1xuICAgICAgICAgIH0sIEhPVkVSX1RJTUVPVVQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgJycsIHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLmhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IHNjb3BlLnVubG9ja2VkID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gdmlld09uTW91c2VPdmVyKGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgaWYgKCFpdGVtIHx8ICFpdGVtLmRhdHVtKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgc2NvcGUudG9vbHRpcFByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbiBhY3RpdmF0ZVRvb2x0aXAoKXtcblxuICAgICAgICAgICAgLy8gYXZvaWQgc2hvd2luZyB0b29sdGlwIGZvciBmYWNldCdzIGJhY2tncm91bmRcbiAgICAgICAgICAgIGlmIChpdGVtLmRhdHVtLl9mYWNldElEKSByZXR1cm47XG5cbiAgICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVAsIGl0ZW0uZGF0dW0pO1xuXG5cbiAgICAgICAgICAgIC8vIGNvbnZlcnQgZGF0YSBpbnRvIGEgZm9ybWF0IHRoYXQgd2UgY2FuIGVhc2lseSB1c2Ugd2l0aCBuZyB0YWJsZSBhbmQgbmctcmVwZWF0XG4gICAgICAgICAgICAvLyBUT0RPOiByZXZpc2UgaWYgdGhpcyBpcyBhY3R1YWxseSBhIGdvb2QgaWRlYVxuICAgICAgICAgICAgc2NvcGUuZGF0YSA9IF8oaXRlbS5kYXR1bSkub21pdCgnX3ByZXYnLCAnX2lkJykgLy8gb21pdCB2ZWdhIGludGVybmFsc1xuICAgICAgICAgICAgICAudG9QYWlycygpLnZhbHVlKClcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICAgICAgcFsxXSA9IGRsLmlzTnVtYmVyKHBbMV0pID8gZm9ybWF0KHBbMV0pIDogcFsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB0b29sdGlwID0gZWxlbWVudC5maW5kKCcudmlzLXRvb2x0aXAnKSxcbiAgICAgICAgICAgICAgJGJvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KSxcbiAgICAgICAgICAgICAgd2lkdGggPSB0b29sdGlwLndpZHRoKCksXG4gICAgICAgICAgICAgIGhlaWdodD0gdG9vbHRpcC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgYWJvdmUgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyBib3R0b20gYm9yZGVyXG4gICAgICAgICAgICBpZiAoZXZlbnQucGFnZVkrMTAraGVpZ2h0IDwgJGJvZHkuaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWSsxMCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWS0xMC1oZWlnaHQpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgb24gbGVmdCBpZiBpdCdzIG5lYXIgdGhlIHNjcmVlbidzIHJpZ2h0IGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VYKzEwKyB3aWR0aCA8ICRib2R5LndpZHRoKCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCAoZXZlbnQucGFnZVgrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYLTEwLXdpZHRoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgVE9PTFRJUF9USU1FT1VUKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3V0KGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgLy9jbGVhciBwb3NpdGlvbnNcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyk7XG4gICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIG51bGwpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgbnVsbCk7XG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRvb2x0aXBQcm9taXNlKTtcbiAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcEFjdGl2ZSkge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVBfRU5ELCBpdGVtLmRhdHVtKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgIHNjb3BlLmRhdGEgPSBbXTtcbiAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWZ1NwZWMoKSB7XG4gICAgICAgICAgdmFyIGNvbmZpZ1NldCA9IHNjb3BlLmNvbmZpZ1NldCB8fCBjb25zdHMuZGVmYXVsdENvbmZpZ1NldCB8fCB7fTtcblxuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQudmxTcGVjKSByZXR1cm47XG5cbiAgICAgICAgICB2YXIgdmxTcGVjID0gXy5jbG9uZURlZXAoc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICBkbC5leHRlbmQodmxTcGVjLmNvbmZpZywgQ29uZmlnW2NvbmZpZ1NldF0oKSk7XG5cbiAgICAgICAgICAvLyB1c2UgY2hhcnQgc3RhdHMgaWYgYXZhaWxhYmxlIChmb3IgZXhhbXBsZSBmcm9tIGJvb2ttYXJrcylcbiAgICAgICAgICB2YXIgc3RhdHMgPSBzY29wZS5jaGFydC5zdGF0cyB8fCBEYXRhc2V0LnN0YXRzO1xuXG4gICAgICAgICAgLy8gU3BlY2lhbCBSdWxlc1xuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHZsU3BlYy5lbmNvZGluZztcbiAgICAgICAgICBpZiAoZW5jb2RpbmcpIHtcbiAgICAgICAgICAgIC8vIHB1dCB4LWF4aXMgb24gdG9wIGlmIHRvbyBoaWdoLWNhcmRpbmFsaXR5XG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcueSAmJiBlbmNvZGluZy55LmZpZWxkICYmIFt2bC50eXBlLk5PTUlOQUwsIHZsLnR5cGUuT1JESU5BTF0uaW5kZXhPZihlbmNvZGluZy55LnR5cGUpID4gLTEpIHtcbiAgICAgICAgICAgICAgaWYgKGVuY29kaW5nLngpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRTdGF0cyA9IHN0YXRzW2VuY29kaW5nLnkuZmllbGRdO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZFN0YXRzICYmIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLnksIHN0YXRzKSA+IDMwKSB7XG4gICAgICAgICAgICAgICAgICAoZW5jb2RpbmcueC5heGlzID0gZW5jb2RpbmcueC5heGlzIHx8IHt9KS5vcmllbnQgPSAndG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlIHNtYWxsZXIgYmFuZCBzaXplIGlmIGhhcyBYIG9yIFkgaGFzIGNhcmRpbmFsaXR5ID4gMTAgb3IgaGFzIGEgZmFjZXRcbiAgICAgICAgICAgIGlmIChlbmNvZGluZy5yb3cgfHxcbiAgICAgICAgICAgICAgICAoZW5jb2RpbmcueSAmJiBzdGF0c1tlbmNvZGluZy55LmZpZWxkXSAmJiB2bC5maWVsZERlZi5jYXJkaW5hbGl0eShlbmNvZGluZy55LCBzdGF0cykgPiAxMCkpIHtcbiAgICAgICAgICAgICAgKGVuY29kaW5nLnkuc2NhbGUgPSBlbmNvZGluZy55LnNjYWxlIHx8IHt9KS5iYW5kU2l6ZSA9IDEyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcuY29sdW1uIHx8XG4gICAgICAgICAgICAgICAgKGVuY29kaW5nLnggJiYgc3RhdHNbZW5jb2RpbmcueC5maWVsZF0gJiYgdmwuZmllbGREZWYuY2FyZGluYWxpdHkoZW5jb2RpbmcueCwgc3RhdHMpID4gMTApKSB7XG4gICAgICAgICAgICAgIChlbmNvZGluZy54LnNjYWxlID0gZW5jb2RpbmcueC5zY2FsZSB8fCB7fSkuYmFuZFNpemUgPSAxMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVuY29kaW5nLmNvbG9yICYmIGVuY29kaW5nLmNvbG9yLnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCAmJlxuICAgICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLmNvbG9yLCBzdGF0cykgPiAxMCkge1xuICAgICAgICAgICAgICAoZW5jb2RpbmcuY29sb3Iuc2NhbGUgPSBlbmNvZGluZy5jb2xvci5zY2FsZSB8fCB7fSkucmFuZ2UgPSAnY2F0ZWdvcnkyMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHZsLmNvbXBpbGUodmxTcGVjKS5zcGVjO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmlzRWxlbWVudCgpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzY2FsZUlmRW5hYmxlKCkge1xuICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZ2V0VmlzRWxlbWVudCgpO1xuICAgICAgICAgIGlmIChzY29wZS5yZXNjYWxlKSB7XG4gICAgICAgICAgICAvLyBoYXZlIHRvIGRpZ2VzdCB0aGUgc2NvcGUgdG8gZW5zdXJlIHRoYXRcbiAgICAgICAgICAgIC8vIGVsZW1lbnQud2lkdGgoKSBpcyBib3VuZCBieSBwYXJlbnQgZWxlbWVudCFcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgdmFyIHhSYXRpbyA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgIDAuMixcbiAgICAgICAgICAgICAgICBlbGVtZW50LndpZHRoKCkgLyAgLyogd2lkdGggb2YgdmxwbG90IGJvdW5kaW5nIGJveCAqL1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoIC8qIHdpZHRoIG9mIHRoZSB2aXMgKi9cbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHhSYXRpbyA8IDEpIHtcbiAgICAgICAgICAgICAgdmlzRWxlbWVudC53aWR0aChzY29wZS53aWR0aCAqIHhSYXRpbylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5oZWlnaHQoc2NvcGUuaGVpZ2h0ICogeFJhdGlvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aXNFbGVtZW50LmNzcygndHJhbnNmb3JtJywgbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAuY3NzKCd0cmFuc2Zvcm0tb3JpZ2luJywgbnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2hvcnRoYW5kKCkge1xuICAgICAgICAgIHJldHVybiBzY29wZS5jaGFydC5zaG9ydGhhbmQgfHwgKHNjb3BlLmNoYXJ0LnZsU3BlYyA/IHZsLnNob3J0aGFuZC5zaG9ydGVuKHNjb3BlLmNoYXJ0LnZsU3BlYykgOiAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJRdWV1ZU5leHQoKSB7XG4gICAgICAgICAgLy8gcmVuZGVyIG5leHQgaXRlbSBpbiB0aGUgcXVldWVcbiAgICAgICAgICBpZiAocmVuZGVyUXVldWUuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSByZW5kZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIG5leHQucGFyc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3Igc2F5IHRoYXQgbm8gb25lIGlzIHJlbmRlcmluZ1xuICAgICAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyKHNwZWMpIHtcbiAgICAgICAgICBpZiAoIXNwZWMpIHtcbiAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gc3BlYy5oZWlnaHQ7XG4gICAgICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdjYW4gbm90IGZpbmQgdmlzIGVsZW1lbnQnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgc2hvcnRoYW5kID0gZ2V0U2hvcnRoYW5kKCk7XG5cbiAgICAgICAgICBzY29wZS5yZW5kZXJlciA9IGdldFJlbmRlcmVyKHNwZWMpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gcGFyc2VWZWdhKCkge1xuICAgICAgICAgICAgLy8gaWYgbm8gbG9uZ2VyIGEgcGFydCBvZiB0aGUgbGlzdCwgY2FuY2VsIVxuICAgICAgICAgICAgaWYgKHNjb3BlLmRlc3Ryb3llZCB8fCBzY29wZS5kaXNhYmxlZCB8fCAoc2NvcGUuaXNJbkxpc3QgJiYgc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkgJiYgIXNjb3BlLmlzSW5MaXN0KHNjb3BlLmNoYXJ0LmZpZWxkU2V0S2V5KSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbmNlbCByZW5kZXJpbmcnLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIC8vIHJlbmRlciBpZiBzdGlsbCBhIHBhcnQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIHZnLnBhcnNlLnNwZWMoc3BlYywgZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZW5kUGFyc2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICB2aWV3ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB2aWV3ID0gY2hhcnQoe2VsOiBlbGVtZW50WzBdfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWNvbnN0cy51c2VVcmwpIHtcbiAgICAgICAgICAgICAgICAgIHZpZXcuZGF0YSh7cmF3OiBEYXRhc2V0LmRhdGF9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyB2aWV3LnJlbmRlcmVyKGdldFJlbmRlcmVyKHNwZWMud2lkdGgsIHNjb3BlLmhlaWdodCkpO1xuICAgICAgICAgICAgICAgIHZpZXcudXBkYXRlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgICAgICAgICAvLyByZWFkICA8Y2FudmFzPi88c3ZnPuKAmXMgd2lkdGggYW5kIGhlaWdodCwgd2hpY2ggaXMgdmVnYSdzIG91dGVyIHdpZHRoIGFuZCBoZWlnaHQgdGhhdCBpbmNsdWRlcyBheGVzIGFuZCBsZWdlbmRzXG4gICAgICAgICAgICAgICAgc2NvcGUud2lkdGggPSAgdmlzRWxlbWVudC53aWR0aCgpO1xuICAgICAgICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHZpc0VsZW1lbnQuaGVpZ2h0KCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgICAkd2luZG93LnZpZXdzID0gJHdpbmRvdy52aWV3cyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3Nbc2hvcnRoYW5kXSA9IHZpZXc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1JFTkRFUiwgJycsIHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgICAgICAgcmVzY2FsZUlmRW5hYmxlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZW5kQ2hhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGFyc2Ugc3BlYycsIChlbmRQYXJzZS1zdGFydCksICdjaGFydGluZycsIChlbmRDaGFydC1lbmRQYXJzZSksIHNob3J0aGFuZCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLnRvb2x0aXApIHtcbiAgICAgICAgICAgICAgICAgIHZpZXcub24oJ21vdXNlb3ZlcicsIHZpZXdPbk1vdXNlT3Zlcik7XG4gICAgICAgICAgICAgICAgICB2aWV3Lm9uKCdtb3VzZW91dCcsIHZpZXdPbk1vdXNlT3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXJlbmRlcmluZykgeyAvLyBpZiBubyBpbnN0YW5jZSBpcyBiZWluZyByZW5kZXIgLS0gcmVuZGVyaW5nIG5vd1xuICAgICAgICAgICAgcmVuZGVyaW5nPXRydWU7XG4gICAgICAgICAgICBwYXJzZVZlZ2EoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHF1ZXVlIGl0XG4gICAgICAgICAgICByZW5kZXJRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgcHJpb3JpdHk6IHNjb3BlLnByaW9yaXR5IHx8IDAsXG4gICAgICAgICAgICAgIHBhcnNlOiBwYXJzZVZlZ2FcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aWV3O1xuICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gT21pdCBkYXRhIHByb3BlcnR5IHRvIHNwZWVkIHVwIGRlZXAgd2F0Y2hcbiAgICAgICAgICByZXR1cm4gXy5vbWl0KHNjb3BlLmNoYXJ0LnZsU3BlYywgJ2RhdGEnKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNwZWMgPSBzY29wZS5jaGFydC52Z1NwZWMgPSBnZXRWZ1NwZWMoKTtcbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LmNsZWFuU3BlYykge1xuICAgICAgICAgICAgLy8gRklYTUVcbiAgICAgICAgICAgIHNjb3BlLmNoYXJ0LmNsZWFuU3BlYyA9IHNjb3BlLmNoYXJ0LnZsU3BlYztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVuZGVyKHNwZWMpO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3ZscGxvdCBkZXN0cm95ZWQnKTtcbiAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3ZlcicpO1xuICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICB2aWV3ID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuICAgICAgICAgIGlmIChjb25zdHMuZGVidWcgJiYgJHdpbmRvdy52aWV3cykge1xuICAgICAgICAgICAgZGVsZXRlICR3aW5kb3cudmlld3Nbc2hvcnRoYW5kXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS5kZXN0cm95ZWQgPSB0cnVlO1xuICAgICAgICAgIC8vIEZJWE1FIGFub3RoZXIgd2F5IHRoYXQgc2hvdWxkIGVsaW1pbmF0ZSB0aGluZ3MgZnJvbSBtZW1vcnkgZmFzdGVyIHNob3VsZCBiZSByZW1vdmluZ1xuICAgICAgICAgIC8vIG1heWJlIHNvbWV0aGluZyBsaWtlXG4gICAgICAgICAgLy8gcmVuZGVyUXVldWUuc3BsaWNlKHJlbmRlclF1ZXVlLmluZGV4T2YocGFyc2VWZWdhKSwgMSkpO1xuICAgICAgICAgIC8vIGJ1dCB3aXRob3V0IHByb3BlciB0ZXN0aW5nLCB0aGlzIGlzIHJpc2tpZXIgdGhhbiBzZXR0aW5nIHNjb3BlLmRlc3Ryb3llZC5cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXAnLCBmdW5jdGlvbiAoQm9va21hcmtzLCBjb25zdHMsIGRsLCB2bCwgRGF0YXNldCwgTG9nZ2VyLCBfKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5nZXREcm9wVGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJy5mYS13cmVuY2gnKVswXTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBzY29wZToge1xuICAgICAgICAvKiBwYXNzIHRvIHZscGxvdCAqKi9cbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPScsXG4gICAgICAgIGlzSW5MaXN0OiAnPScsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJz0nLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgbWF4SGVpZ2h0OiAnPScsXG4gICAgICAgIG1heFdpZHRoOiAnPScsXG4gICAgICAgIG92ZXJmbG93OiAnPScsXG4gICAgICAgIHByaW9yaXR5OiAnPScsXG4gICAgICAgIHJlc2NhbGU6ICc9JyxcbiAgICAgICAgdGh1bWJuYWlsOiAnPScsXG4gICAgICAgIHRvb2x0aXA6ICc9JyxcblxuICAgICAgICAvKiB2bHBsb3Rncm91cCBzcGVjaWZpYyAqL1xuXG4gICAgICAgIGZpZWxkU2V0OiAnPScsXG5cbiAgICAgICAgc2hvd0Jvb2ttYXJrOiAnQCcsXG4gICAgICAgIHNob3dEZWJ1ZzogJz0nLFxuICAgICAgICBzaG93RXhwYW5kOiAnPScsXG4gICAgICAgIHNob3dGaWx0ZXJOdWxsOiAnQCcsXG4gICAgICAgIHNob3dMYWJlbDogJ0AnLFxuICAgICAgICBzaG93TG9nOiAnQCcsXG4gICAgICAgIHNob3dNYXJrOiAnQCcsXG4gICAgICAgIHNob3dTb3J0OiAnQCcsXG4gICAgICAgIHNob3dUcmFuc3Bvc2U6ICdAJyxcblxuICAgICAgICBhbHdheXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBpc1NlbGVjdGVkOiAnPScsXG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPScsXG4gICAgICAgIGV4cGFuZEFjdGlvbjogJyYnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICAvLyBEZWZlciByZW5kZXJpbmcgdGhlIGRlYnVnIERyb3AgcG9wdXAgdW50aWwgaXQgaXMgcmVxdWVzdGVkXG4gICAgICAgIHNjb3BlLnJlbmRlclBvcHVwID0gZmFsc2U7XG4gICAgICAgIC8vIFVzZSBfLm9uY2UgYmVjYXVzZSB0aGUgcG9wdXAgb25seSBuZWVkcyB0byBiZSBpbml0aWFsaXplZCBvbmNlXG4gICAgICAgIHNjb3BlLmluaXRpYWxpemVQb3B1cCA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLmxvZ0NvZGUgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKG5hbWUrJzpcXG5cXG4nLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBMT0dcblxuICAgICAgICBzY29wZS5sb2cgPSB7fTtcbiAgICAgICAgc2NvcGUubG9nLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzcGVjKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHNwZWMuZW5jb2RpbmcsXG4gICAgICAgICAgICBmaWVsZERlZiA9IGVuY29kaW5nW2NoYW5uZWxdO1xuXG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmICYmIGZpZWxkRGVmLnR5cGUgPT09IHZsLnR5cGUuUVVBTlRJVEFUSVZFICYmICFmaWVsZERlZi5iaW47XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUubG9nLnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMsIGNoYW5uZWwpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmxvZy5zdXBwb3J0KHNwZWMsIGNoYW5uZWwpKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgdmFyIGZpZWxkRGVmID0gc3BlYy5lbmNvZGluZ1tjaGFubmVsXSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGREZWYuc2NhbGUgPSBmaWVsZERlZi5zY2FsZSB8fCB7fTtcblxuICAgICAgICAgIHNjYWxlLnR5cGUgPSBzY2FsZS50eXBlID09PSAnbG9nJyA/ICdsaW5lYXInIDogJ2xvZyc7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkxPR19UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG4gICAgICAgIH07XG4gICAgICAgIHNjb3BlLmxvZy5hY3RpdmUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlID0gZmllbGREZWYuc2NhbGUgfHwge307XG5cbiAgICAgICAgICByZXR1cm4gc2NhbGUudHlwZSA9PT0gJ2xvZyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVE9HR0xFIEZJTFRFUlxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZUZpbHRlck51bGwgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLk5VTExfRklMVEVSX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcblxuICAgICAgICAgIHNwZWMuY29uZmlnID0gc3BlYy5jb25maWcgfHwge307XG4gICAgICAgICAgc3BlYy5jb25maWcuZmlsdGVyTnVsbCA9IHNwZWMuY29uZmlnLmZpbHRlck51bGwgPT09IHRydWUgPyB1bmRlZmluZWQgOiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgdmFyIGZpZWxkRGVmcyA9IHZsLnNwZWMuZmllbGREZWZzKHNwZWMpO1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gZmllbGREZWZzKSB7XG4gICAgICAgICAgICB2YXIgZmllbGREZWYgPSBmaWVsZERlZnNbaV07XG4gICAgICAgICAgICBpZiAoXy5pbmNsdWRlcyhbdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdLCBmaWVsZERlZi50eXBlKSAmJlxuICAgICAgICAgICAgICAgIChmaWVsZERlZi5uYW1lIGluIHN0YXRzKSAmJlxuICAgICAgICAgICAgICAgIHN0YXRzW2ZpZWxkRGVmLm5hbWVdLm1pc3NpbmcgPiAwXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlU29ydCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0ge307XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlcyA9IFsnb3JkaW5hbC1hc2NlbmRpbmcnLCAnb3JkaW5hbC1kZXNjZW5kaW5nJyxcbiAgICAgICAgICAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycsICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycsICdjdXN0b20nXTtcblxuICAgICAgICB0b2dnbGVTb3J0LnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU09SVF9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRNb2RlID0gdG9nZ2xlU29ydC5tb2RlKHNwZWMpO1xuICAgICAgICAgIHZhciBjdXJyZW50TW9kZUluZGV4ID0gdG9nZ2xlU29ydC5tb2Rlcy5pbmRleE9mKGN1cnJlbnRNb2RlKTtcblxuICAgICAgICAgIHZhciBuZXdNb2RlSW5kZXggPSAoY3VycmVudE1vZGVJbmRleCArIDEpICUgKHRvZ2dsZVNvcnQubW9kZXMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgdmFyIG5ld01vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW25ld01vZGVJbmRleF07XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygndG9nZ2xlU29ydCcsIGN1cnJlbnRNb2RlLCBuZXdNb2RlKTtcblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0ID0gdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKiBHZXQgc29ydCBwcm9wZXJ0eSBkZWZpbml0aW9uIHRoYXQgbWF0Y2hlcyBlYWNoIG1vZGUuICovXG4gICAgICAgIHRvZ2dsZVNvcnQuZ2V0U29ydCA9IGZ1bmN0aW9uKG1vZGUsIHNwZWMpIHtcbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtYXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdhc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtb2RlID09PSAnb3JkaW5hbC1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdkZXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHZhciBxRW5jRGVmID0gc3BlYy5lbmNvZGluZ1tjaGFubmVscy5xdWFudGl0YXRpdmVdO1xuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdhc2NlbmRpbmcnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBvcDogcUVuY0RlZi5hZ2dyZWdhdGUsXG4gICAgICAgICAgICAgIGZpZWxkOiBxRW5jRGVmLmZpZWxkLFxuICAgICAgICAgICAgICBvcmRlcjogJ2Rlc2NlbmRpbmcnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHZhciBzb3J0ID0gc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0O1xuXG4gICAgICAgICAgaWYgKHNvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuICdvcmRpbmFsLWFzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEgOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHNvcnQgbWF0Y2hlcyBhbnkgb2YgdGhlIHNvcnQgZm9yIGVhY2ggbW9kZSBleGNlcHQgJ2N1c3RvbScuXG4gICAgICAgICAgICB2YXIgbW9kZSA9IHRvZ2dsZVNvcnQubW9kZXNbaV07XG4gICAgICAgICAgICB2YXIgc29ydE9mTW9kZSA9IHRvZ2dsZVNvcnQuZ2V0U29ydChtb2RlLCBzcGVjKTtcblxuICAgICAgICAgICAgaWYgKF8uaXNFcXVhbChzb3J0LCBzb3J0T2ZNb2RlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZGwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcblxuICAgICAgICAgIGlmICh2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdyb3cnKSB8fCB2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdjb2x1bW4nKSB8fFxuICAgICAgICAgICAgIXZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3gnKSB8fCAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneScpIHx8XG4gICAgICAgICAgICAhdmwuc3BlYy5hbHdheXNOb09jY2x1c2lvbihzcGVjLCBzdGF0cykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAoZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwpICYmXG4gICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmlzTWVhc3VyZShlbmNvZGluZy55KVxuICAgICAgICAgICAgKSA/ICd4JyA6XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLngpXG4gICAgICAgICAgICApID8gJ3knIDogZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudG9nZ2xlU29ydENsYXNzID0gZnVuY3Rpb24odmxTcGVjKSB7XG4gICAgICAgICAgaWYgKCF2bFNwZWMgfHwgIXRvZ2dsZVNvcnQuc3VwcG9ydCh2bFNwZWMsIERhdGFzZXQuc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ludmlzaWJsZSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIG9yZGluYWxDaGFubmVsID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQuY2hhbm5lbHModmxTcGVjKS5vcmRpbmFsLFxuICAgICAgICAgICAgbW9kZSA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0Lm1vZGUodmxTcGVjKTtcblxuICAgICAgICAgIHZhciBkaXJlY3Rpb25DbGFzcyA9IG9yZGluYWxDaGFubmVsID09PSAneCcgPyAnc29ydC14ICcgOiAnJztcblxuICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1hc2MnO1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtZGVzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWFzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1kZXNjJztcbiAgICAgICAgICAgIGRlZmF1bHQ6IC8vIGN1c3RvbVxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydCc7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5UUkFOU1BPU0VfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIHZsLnNwZWMudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmNoYXJ0ID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBQb3B1cCcsIGZ1bmN0aW9uIChEcm9wKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignY29tcGFjdEpTT04nLCBmdW5jdGlvbihKU09OMykge1xuICAgIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIEpTT04zLnN0cmluZ2lmeShpbnB1dCwgbnVsbCwgJyAgJywgODApO1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIGZhY2V0ZWR2aXouZmlsdGVyOnJlcG9ydFVybFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcmVwb3J0VXJsXG4gKiBGaWx0ZXIgaW4gdGhlIGZhY2V0ZWR2aXouXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigncmVwb3J0VXJsJywgZnVuY3Rpb24gKGNvbXBhY3RKU09ORmlsdGVyLCBfLCBjb25zdHMpIHtcbiAgICBmdW5jdGlvbiB2b3lhZ2VyUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzFUOVpBMTRGM21tenJIUjdKSlZVS3lQWHpyTXFGNTRDakxJT2p2MkU3WkVNL3ZpZXdmb3JtPyc7XG5cbiAgICAgIGlmIChwYXJhbXMuZmllbGRzKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihfLnZhbHVlcyhwYXJhbXMuZmllbGRzKSkpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHF1ZXJ5ICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnNwZWMpIHtcbiAgICAgICAgdmFyIHNwZWMgPSBfLm9taXQocGFyYW1zLnNwZWMsICdjb25maWcnKTtcbiAgICAgICAgc3BlYyA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTMyMzY4MDEzNj0nICsgc3BlYyArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjMikge1xuICAgICAgICB2YXIgc3BlYzIgPSBfLm9taXQocGFyYW1zLnNwZWMyLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMyID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMyKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuODUzMTM3Nzg2PScgKyBzcGVjMiArICcmJztcbiAgICAgIH1cblxuICAgICAgdmFyIHR5cGVQcm9wID0gJ2VudHJ5LjE5NDAyOTI2Nzc9JztcbiAgICAgIHN3aXRjaCAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAndmwnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdWaXN1YWxpemF0aW9uK1JlbmRlcmluZysoVmVnYWxpdGUpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ZyJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrQWxnb3JpdGhtKyhWaXNyZWMpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z2JzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrVUkrKEZhY2V0ZWRWaXopJic7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmx1aVJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xeEtzLXFHYUxaRVVmYlRtaGRtU29TMTNPS09FcHV1X05OV0U1VEFBbWxfWS92aWV3Zm9ybT8nO1xuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiBjb25zdHMuYXBwSWQgPT09ICd2b3lhZ2VyJyA/IHZveWFnZXJSZXBvcnQgOiB2bHVpUmVwb3J0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjplbmNvZGVVcmlcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGVuY29kZVVyaVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignZW5jb2RlVVJJJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiB3aW5kb3cuZW5jb2RlVVJJKGlucHV0KTtcbiAgICB9O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjp1bmRlcnNjb3JlMnNwYWNlXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyB1bmRlcnNjb3JlMnNwYWNlXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCd1bmRlcnNjb3JlMnNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiBpbnB1dCA/IGlucHV0LnJlcGxhY2UoL18rL2csICcgJykgOiAnJztcbiAgICB9O1xuICB9KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
