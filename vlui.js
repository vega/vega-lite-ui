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
window.     vlSchema = {
  "oneOf": [
    {
      "$ref": "#/definitions/ExtendedUnitSpec",
      "description": "Schema for a unit Vega-Lite specification, with the syntactic sugar extensions:\n\n- `row` and `column` are included in the encoding.\n\n- (Future) label, box plot\n\n\n\nNote: the spec could contain facet."
    },
    {
      "$ref": "#/definitions/FacetSpec"
    },
    {
      "$ref": "#/definitions/LayerSpec"
    }
  ],
  "definitions": {
    "ExtendedUnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/Encoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "projection": {
          "$ref": "#/definitions/Projection"
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "Mark": {
      "type": "string",
      "enum": [
        "area",
        "bar",
        "line",
        "point",
        "text",
        "tick",
        "rule",
        "circle",
        "square",
        "path",
        "errorBar"
      ]
    },
    "Encoding": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Vertical facets for trellis plots."
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Horizontal facets for trellis plots."
        },
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "geopath": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    },
    "PositionChannelDef": {
      "type": "object",
      "properties": {
        "axis": {
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Axis"
            }
          ]
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Axis": {
      "type": "object",
      "properties": {
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "format": {
          "description": "The formatting pattern for axis labels.",
          "type": "string"
        },
        "orient": {
          "$ref": "#/definitions/AxisOrient",
          "description": "The orientation of the axis. One of top, bottom, left or right. The orientation can be used to further specialize the axis type (e.g., a y axis oriented for the right edge of the chart)."
        },
        "title": {
          "description": "A title for the axis. Shows field name and its function by default.",
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "AxisOrient": {
      "type": "string",
      "enum": [
        "top",
        "right",
        "left",
        "bottom"
      ]
    },
    "Scale": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/ScaleType"
        },
        "domain": {
          "description": "The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values. The domain may also be specified by a reference to a data source.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "range": {
          "description": "The range of the scale, representing the set of visual values. For numeric values, the range can take the form of a two-element array with minimum and maximum values. For ordinal or quantized data, the range may by an array of desired output values, which are mapped to elements in the specified domain. For ordinal scales only, the range can be defined using a DataRef: the range values are then drawn dynamically from a backing data set.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "round": {
          "description": "If true, rounds numeric output values to integers. This can be helpful for snapping to the pixel grid.",
          "type": "boolean"
        },
        "bandSize": {
          "minimum": 0,
          "type": "number"
        },
        "padding": {
          "description": "Applies spacing among ordinal elements in the scale range. The actual effect depends on how the scale is configured. If the __points__ parameter is `true`, the padding value is interpreted as a multiple of the spacing between points. A reasonable value is 1.0, such that the first and last point will be offset from the minimum and maximum value by half the distance between points. Otherwise, padding is typically in the range [0, 1] and corresponds to the fraction of space in the range interval to allocate to padding. A value of 0.5 means that the range band width will be equal to the padding width. For more, see the [D3 ordinal scale documentation](https://github.com/mbostock/d3/wiki/Ordinal-Scales).",
          "type": "number"
        },
        "clamp": {
          "description": "If true, values that exceed the data domain are clamped to either the minimum or maximum range value",
          "type": "boolean"
        },
        "nice": {
          "description": "If specified, modifies the scale domain to use a more human-friendly value range. If specified as a true boolean, modifies the scale domain to use a more human-friendly number range (e.g., 7 instead of 6.96). If specified as a string, modifies the scale domain to use a more human-friendly value range. For time and utc scale types only, the nice value should be a string indicating the desired time interval.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/NiceTime"
            }
          ]
        },
        "exponent": {
          "description": "Sets the exponent of the scale transformation. For pow scale types only, otherwise ignored.",
          "type": "number"
        },
        "zero": {
          "description": "If true, ensures that a zero baseline value is included in the scale domain. This option is ignored for non-quantitative scales.",
          "type": "boolean"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        }
      }
    },
    "ScaleType": {
      "type": "string",
      "enum": [
        "linear",
        "log",
        "pow",
        "sqrt",
        "quantile",
        "quantize",
        "ordinal",
        "time",
        "utc"
      ]
    },
    "NiceTime": {
      "type": "string",
      "enum": [
        "second",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "year"
      ]
    },
    "SortField": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field name to aggregate over.",
          "type": "string"
        },
        "op": {
          "$ref": "#/definitions/AggregateOp",
          "description": "The sort aggregation operator"
        },
        "order": {
          "$ref": "#/definitions/SortOrder"
        }
      },
      "required": [
        "field",
        "op"
      ]
    },
    "AggregateOp": {
      "type": "string",
      "enum": [
        "values",
        "count",
        "valid",
        "missing",
        "distinct",
        "sum",
        "mean",
        "average",
        "variance",
        "variancep",
        "stdev",
        "stdevp",
        "median",
        "q1",
        "q3",
        "modeskew",
        "min",
        "max",
        "argmin",
        "argmax"
      ]
    },
    "SortOrder": {
      "type": "string",
      "enum": [
        "ascending",
        "descending",
        "none"
      ]
    },
    "Type": {
      "type": "string",
      "enum": [
        "quantitative",
        "ordinal",
        "temporal",
        "nominal",
        "geojson",
        "longitude",
        "latitude"
      ]
    },
    "TimeUnit": {
      "type": "string",
      "enum": [
        "year",
        "month",
        "day",
        "date",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "yearmonth",
        "yearmonthday",
        "yearmonthdate",
        "yearday",
        "yeardate",
        "yearmonthdayhours",
        "yearmonthdayhoursminutes",
        "yearmonthdayhoursminutesseconds",
        "hoursminutes",
        "hoursminutesseconds",
        "minutesseconds",
        "secondsmilliseconds",
        "quarter",
        "yearquarter",
        "quartermonth",
        "yearquartermonth"
      ]
    },
    "Bin": {
      "type": "object",
      "properties": {
        "min": {
          "description": "The minimum bin value to consider. If unspecified, the minimum value of the specified field is used.",
          "type": "number"
        },
        "max": {
          "description": "The maximum bin value to consider. If unspecified, the maximum value of the specified field is used.",
          "type": "number"
        },
        "base": {
          "description": "The number base to use for automatic bin determination (default is base 10).",
          "type": "number"
        },
        "step": {
          "description": "An exact step size to use between bins. If provided, options such as maxbins will be ignored.",
          "type": "number"
        },
        "steps": {
          "description": "An array of allowable step sizes to choose from.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "minstep": {
          "description": "A minimum allowable step size (particularly useful for integer values).",
          "type": "number"
        },
        "div": {
          "description": "Scale factors indicating allowable subdivisions. The default value is [5, 2], which indicates that for base 10 numbers (the default base), the method may consider dividing bin sizes by 5 and/or 2. For example, for an initial step size of 10, the method can check if bin sizes of 2 (= 10/5), 5 (= 10/2), or 1 (= 10/(5*2)) might also satisfy the given constraints.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "maxbins": {
          "description": "Maximum number of bins.",
          "minimum": 2,
          "type": "number"
        }
      }
    },
    "ChannelDefWithLegend": {
      "type": "object",
      "properties": {
        "legend": {
          "$ref": "#/definitions/Legend"
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Legend": {
      "type": "object",
      "properties": {
        "format": {
          "description": "An optional formatting pattern for legend labels. Vega uses D3\\'s format pattern.",
          "type": "string"
        },
        "title": {
          "description": "A title for the legend. (Shows field name and its function by default.)",
          "type": "string"
        },
        "values": {
          "description": "Explicitly set the visible legend values.",
          "type": "array",
          "items": {}
        },
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down'.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FieldDef": {
      "type": "object",
      "properties": {
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "OrderChannelDef": {
      "type": "object",
      "properties": {
        "sort": {
          "$ref": "#/definitions/SortOrder"
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Data": {
      "type": "object",
      "properties": {
        "format": {
          "$ref": "#/definitions/DataFormat",
          "description": "An object that specifies the format for the data file or values."
        },
        "url": {
          "description": "A URL from which to load the data set. Use the formatType property\n\nto ensure the loaded data is correctly parsed.",
          "type": "string"
        },
        "values": {
          "description": "Pass array of objects instead of a url to a file.",
          "type": "array",
          "items": {}
        }
      }
    },
    "DataFormat": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/DataFormatType",
          "description": "Type of input data: `\"json\"`, `\"csv\"`, `\"tsv\"`.\n\nThe default format type is determined by the extension of the file url.\n\nIf no extension is detected, `\"json\"` will be used by default."
        },
        "property": {
          "description": "JSON only) The JSON property containing the desired data.\n\nThis parameter can be used when the loaded JSON file may have surrounding structure or meta-data.\n\nFor example `\"property\": \"values.features\"` is equivalent to retrieving `json.values.features`\n\nfrom the loaded JSON object.",
          "type": "string"
        },
        "feature": {
          "description": "The name of the TopoJSON object set to convert to a GeoJSON feature collection.\n\nFor example, in a map of the world, there may be an object set named `\"countries\"`.\n\nUsing the feature property, we can extract this set and generate a GeoJSON feature object for each country.",
          "type": "string"
        },
        "mesh": {
          "description": "The name of the TopoJSON object set to convert to a mesh.\n\nSimilar to the `feature` option, `mesh` extracts a named TopoJSON object set.\n\nUnlike the `feature` option, the corresponding geo data is returned as a single, unified mesh instance, not as inidividual GeoJSON features.\n\nExtracting a mesh is useful for more efficiently drawing borders or other geographic elements that you do not need to associate with specific regions such as individual countries, states or counties.",
          "type": "string"
        }
      }
    },
    "DataFormatType": {
      "type": "string",
      "enum": [
        "json",
        "csv",
        "tsv",
        "topojson"
      ]
    },
    "Transform": {
      "type": "object",
      "properties": {
        "filter": {
          "description": "A string containing the filter Vega expression. Use `datum` to refer to the current data object.",
          "type": "string"
        },
        "filterNull": {
          "description": "Filter null values from the data. If set to true, all rows with null values are filtered. If false, no rows are filtered. Set the property to undefined to filter only quantitative and temporal fields.",
          "type": "boolean"
        },
        "calculate": {
          "description": "Calculate new field(s) using the provided expresssion(s). Calculation are applied before filter.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/Formula",
            "description": "Formula object for calculate."
          }
        }
      }
    },
    "Formula": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field in which to store the computed formula value.",
          "type": "string"
        },
        "expr": {
          "description": "A string containing an expression for the formula. Use the variable `datum` to to refer to the current data object.",
          "type": "string"
        }
      },
      "required": [
        "field",
        "expr"
      ]
    },
    "Projection": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string"
        },
        "center": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "translate": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "scale": {
          "type": "number"
        },
        "rotate": {
          "description": "The rotation of the projection.",
          "type": "number"
        },
        "precision": {
          "type": "number"
        },
        "clipAngle": {
          "type": "number"
        }
      }
    },
    "Config": {
      "type": "object",
      "properties": {
        "viewport": {
          "description": "The width and height of the on-screen viewport, in pixels. If necessary, clipping and scrolling will be applied.",
          "type": "number"
        },
        "background": {
          "description": "CSS color property to use as background of visualization. Default is `\"transparent\"`.",
          "type": "string"
        },
        "numberFormat": {
          "description": "D3 Number format for axis labels and text tables. For example \"s\" for SI units.",
          "type": "string"
        },
        "timeFormat": {
          "description": "Default datetime format for axis and legend labels. The format can be set directly on each axis and legend.",
          "type": "string"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Cell Config"
        },
        "mark": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Mark Config"
        },
        "overlay": {
          "$ref": "#/definitions/OverlayConfig",
          "description": "Mark Overlay Config"
        },
        "scale": {
          "$ref": "#/definitions/ScaleConfig",
          "description": "Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Axis Config"
        },
        "legend": {
          "$ref": "#/definitions/LegendConfig",
          "description": "Legend Config"
        },
        "projection": {
          "$ref": "#/definitions/Projection"
        },
        "facet": {
          "$ref": "#/definitions/FacetConfig",
          "description": "Facet Config"
        }
      }
    },
    "CellConfig": {
      "type": "object",
      "properties": {
        "width": {
          "type": "number"
        },
        "height": {
          "type": "number"
        },
        "clip": {
          "type": "boolean"
        },
        "fill": {
          "description": "The fill color.",
          "format": "color",
          "type": "string"
        },
        "fillOpacity": {
          "description": "The fill opacity (value between [0,1]).",
          "type": "number"
        },
        "stroke": {
          "description": "The stroke color.",
          "type": "string"
        },
        "strokeOpacity": {
          "description": "The stroke opacity (value between [0,1]).",
          "type": "number"
        },
        "strokeWidth": {
          "description": "The stroke width, in pixels.",
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        }
      }
    },
    "MarkConfig": {
      "type": "object",
      "properties": {
        "filled": {
          "description": "Whether the shape\\'s color should be used as fill color instead of stroke color.\n\nThis is only applicable for \"bar\", \"point\", and \"area\".\n\nAll marks except \"point\" marks are filled by default.\n\nSee Mark Documentation (http://vega.github.io/vega-lite/docs/marks.html)\n\nfor usage example.",
          "type": "boolean"
        },
        "color": {
          "description": "Default color.",
          "format": "color",
          "type": "string"
        },
        "fill": {
          "description": "Default Fill Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "stroke": {
          "description": "Default Stroke Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "fillOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeWidth": {
          "minimum": 0,
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        },
        "stacked": {
          "$ref": "#/definitions/StackOffset"
        },
        "orient": {
          "description": "The orientation of a non-stacked bar, tick, area, and line charts.\n\nThe value is either horizontal (default) or vertical.\n\n- For bar, rule and tick, this determines whether the size of the bar and tick\n\nshould be applied to x or y dimension.\n\n- For area, this property determines the orient property of the Vega output.\n\n- For line, this property determines the sort order of the points in the line\n\nif `config.sortLineBy` is not specified.\n\nFor stacked charts, this is always determined by the orientation of the stack;\n\ntherefore explicitly specified value will be ignored.",
          "type": "string"
        },
        "interpolate": {
          "$ref": "#/definitions/Interpolate",
          "description": "The line interpolation method to use. One of linear, step-before, step-after, basis, basis-open, cardinal, cardinal-open, monotone."
        },
        "tension": {
          "description": "Depending on the interpolation type, sets the tension parameter.",
          "type": "number"
        },
        "lineSize": {
          "description": "Size of line mark.",
          "type": "number"
        },
        "ruleSize": {
          "description": "Size of rule mark.",
          "type": "number"
        },
        "barSize": {
          "description": "The size of the bars.  If unspecified, the default size is  `bandSize-1`,\n\nwhich provides 1 pixel offset between bars.",
          "type": "number"
        },
        "barThinSize": {
          "description": "The size of the bars on continuous scales.",
          "type": "number"
        },
        "shape": {
          "$ref": "#/definitions/Shape",
          "description": "The symbol shape to use. One of circle (default), square, cross, diamond, triangle-up, or triangle-down."
        },
        "size": {
          "description": "The pixel area each the point. For example: in the case of circles, the radius is determined in part by the square root of the size value.",
          "type": "number"
        },
        "tickSize": {
          "description": "The width of the ticks.",
          "type": "number"
        },
        "tickThickness": {
          "description": "Thickness of the tick mark.",
          "type": "number"
        },
        "align": {
          "$ref": "#/definitions/HorizontalAlign",
          "description": "The horizontal alignment of the text. One of left, right, center."
        },
        "angle": {
          "description": "The rotation angle of the text, in degrees.",
          "type": "number"
        },
        "baseline": {
          "$ref": "#/definitions/VerticalAlign",
          "description": "The vertical alignment of the text. One of top, middle, bottom."
        },
        "dx": {
          "description": "The horizontal offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "dy": {
          "description": "The vertical offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "radius": {
          "description": "Polar coordinate radial offset, in pixels, of the text label from the origin determined by the x and y properties.",
          "type": "number"
        },
        "theta": {
          "description": "Polar coordinate angle, in radians, of the text label from the origin determined by the x and y properties. Values for theta follow the same convention of arc mark startAngle and endAngle properties: angles are measured in radians, with 0 indicating \"north\".",
          "type": "number"
        },
        "font": {
          "description": "The typeface to set the text in (e.g., Helvetica Neue).",
          "type": "string"
        },
        "fontSize": {
          "description": "The font size, in pixels.",
          "type": "number"
        },
        "fontStyle": {
          "$ref": "#/definitions/FontStyle",
          "description": "The font style (e.g., italic)."
        },
        "fontWeight": {
          "$ref": "#/definitions/FontWeight",
          "description": "The font weight (e.g., bold)."
        },
        "format": {
          "description": "The formatting pattern for text value. If not defined, this will be determined automatically.",
          "type": "string"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "text": {
          "description": "Placeholder Text",
          "type": "string"
        },
        "applyColorToBackground": {
          "description": "Apply color field to background color instead of the text.",
          "type": "boolean"
        }
      }
    },
    "StackOffset": {
      "type": "string",
      "enum": [
        "zero",
        "center",
        "normalize",
        "none"
      ]
    },
    "Interpolate": {
      "type": "string",
      "enum": [
        "linear",
        "linear-closed",
        "step",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "bundle",
        "monotone"
      ]
    },
    "Shape": {
      "type": "string",
      "enum": [
        "circle",
        "square",
        "cross",
        "diamond",
        "triangle-up",
        "triangle-down"
      ]
    },
    "HorizontalAlign": {
      "type": "string",
      "enum": [
        "left",
        "right",
        "center"
      ]
    },
    "VerticalAlign": {
      "type": "string",
      "enum": [
        "top",
        "middle",
        "bottom"
      ]
    },
    "FontStyle": {
      "type": "string",
      "enum": [
        "normal",
        "italic"
      ]
    },
    "FontWeight": {
      "type": "string",
      "enum": [
        "normal",
        "bold"
      ]
    },
    "OverlayConfig": {
      "type": "object",
      "properties": {
        "line": {
          "description": "Whether to overlay line with point.",
          "type": "boolean"
        },
        "area": {
          "$ref": "#/definitions/AreaOverlay",
          "description": "Type of overlay for area mark (line or linepoint)"
        },
        "pointStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        },
        "lineStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        }
      }
    },
    "AreaOverlay": {
      "type": "string",
      "enum": [
        "line",
        "linepoint",
        "none"
      ]
    },
    "ScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "description": "If true, rounds numeric output values to integers.\n\nThis can be helpful for snapping to the pixel grid.\n\n(Only available for `x`, `y`, `size`, `row`, and `column` scales.)",
          "type": "boolean"
        },
        "textBandWidth": {
          "description": "Default band width for `x` ordinal scale when is mark is `text`.",
          "minimum": 0,
          "type": "number"
        },
        "bandSize": {
          "description": "Default band size for (1) `y` ordinal scale,\n\nand (2) `x` ordinal scale when the mark is not `text`.",
          "minimum": 0,
          "type": "number"
        },
        "opacity": {
          "description": "Default range for opacity.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "padding": {
          "description": "Default padding for `x` and `y` ordinal scales.",
          "type": "number"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        },
        "nominalColorRange": {
          "description": "Default range for nominal color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "sequentialColorRange": {
          "description": "Default range for ordinal / continuous color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "shapeRange": {
          "description": "Default range for shape",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "barSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "fontSizeRange": {
          "description": "Default range for font size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "ruleSizeRange": {
          "description": "Default range for rule stroke widths",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "tickSizeRange": {
          "description": "Default range for tick spans",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "pointSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        }
      }
    },
    "AxisConfig": {
      "type": "object",
      "properties": {
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "LegendConfig": {
      "type": "object",
      "properties": {
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down'.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FacetConfig": {
      "type": "object",
      "properties": {
        "scale": {
          "$ref": "#/definitions/FacetScaleConfig",
          "description": "Facet Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Facet Axis Config"
        },
        "grid": {
          "$ref": "#/definitions/FacetGridConfig",
          "description": "Facet Grid Config"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Facet Cell Config"
        }
      }
    },
    "FacetScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "type": "boolean"
        },
        "padding": {
          "type": "number"
        }
      }
    },
    "FacetGridConfig": {
      "type": "object",
      "properties": {
        "color": {
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "type": "number"
        },
        "offset": {
          "type": "number"
        }
      }
    },
    "FacetSpec": {
      "type": "object",
      "properties": {
        "facet": {
          "$ref": "#/definitions/Facet"
        },
        "spec": {
          "oneOf": [
            {
              "$ref": "#/definitions/LayerSpec"
            },
            {
              "$ref": "#/definitions/UnitSpec"
            }
          ]
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "projection": {
          "$ref": "#/definitions/Projection"
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "facet",
        "spec"
      ]
    },
    "Facet": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef"
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef"
        }
      }
    },
    "LayerSpec": {
      "type": "object",
      "properties": {
        "layers": {
          "description": "Unit specs that will be layered.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/UnitSpec"
          }
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "projection": {
          "$ref": "#/definitions/Projection"
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "layers"
      ]
    },
    "UnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/UnitEncoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "projection": {
          "$ref": "#/definitions/Projection"
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "UnitEncoding": {
      "type": "object",
      "properties": {
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "geopath": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
};
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
  .constant('vl', window.vl)
  .constant('vlSchema', window.vlSchema)
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
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'vg', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, vg, vl, SampleData, Config, Logger) {
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
      var types = vg.util.type.inferAll(data),
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

      schema = vg.util.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

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
            data = vg.util.read(response.data, {type: 'csv'});
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
      Dataset.stats = vg.util.summary(data).reduce(function(s, profile) {
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
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'vg', function (Dataset, Logger, Config, _, vg) {
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
          var data = vg.util.read(scope.dataset.data, {
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
'use strict';

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
          if (funcsPopup && funcsPopup.destroy) {
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
  .factory('Schema', ['vlSchema', function(vlSchema) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      var ref = encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref;
      var def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  }]);
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
  .directive('vlPlot', ['vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
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

        var format = vg.util.format.number('');

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
          if (!item || !item.datum) {
            return;
          }

          scope.tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) {
              return;
            }

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);


            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .toPairs().value()
              .map(function(p) {
                p[1] = vg.util.isNumber(p[1]) ? format(p[1]) : p[1];
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

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());

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
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                return;
              }
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
                $timeout(renderQueueNext);
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
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vg', 'vl', 'Dataset', 'Logger', '_', function (Bookmarks, consts, vg, vl, Dataset, Logger, _) {
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

          if (vg.util.isObject(sort) && sort.op && sort.field) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ2bC1zY2hlbWEuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmpzIiwiYWxlcnRzL2FsZXJ0cy5zZXJ2aWNlLmpzIiwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5qcyIsImJvb2ttYXJrcy9ib29rbWFya3Muc2VydmljZS5qcyIsImNvbmZpZy9jb25maWcuc2VydmljZS5qcyIsImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0LmpzIiwiZGF0YXNldC9hZGR1cmxkYXRhc2V0LmpzIiwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0LmpzIiwiZGF0YXNldC9kYXRhc2V0LnNlcnZpY2UuanMiLCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5qcyIsImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmpzIiwiZGF0YXNldC9maWxlZHJvcHpvbmUuanMiLCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5qcyIsImRhdGFzZXQvc2FtcGxlZGF0YS5qcyIsImZpZWxkaW5mby9maWVsZGluZm8uanMiLCJsb2dnZXIvbG9nZ2VyLnNlcnZpY2UuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsY2xvc2VidXR0b24uanMiLCJtb2RhbC9tb2RhbHMuc2VydmljZS5qcyIsInNjaGVtYS9zY2hlbWEuc2VydmljZS5qcyIsInRhYnMvdGFiLmpzIiwidGFicy90YWJzZXQuanMiLCJ2bHBsb3QvdmxwbG90LmpzIiwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuanMiLCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmpzIiwiZmlsdGVycy9jb21wYWN0anNvbi9jb21wYWN0anNvbi5maWx0ZXIuanMiLCJmaWx0ZXJzL2VuY29kZXVyaS9lbmNvZGV1cmkuZmlsdGVyLmpzIiwiZmlsdGVycy9yZXBvcnR1cmwvcmVwb3J0dXJsLmZpbHRlci5qcyIsImZpbHRlcnMvdW5k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bkQ7Ozs7QUMzREw7Ozs7Ozs7Ozs7QUFVQSxRQUFRLE9BQU87R0FDWixPQUFPLG9CQUFvQixZQUFZO0lBQ3RDLE9BQU8sVUFBVSxPQUFPO01BQ3RCLE9BQU8sUUFBUSxNQUFNLFFBQVEsT0FBTyxPQUFPOztLQUU1QyIsImZpbGUiOiJ2bHVpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBKU09OMyB3aXRoIGNvbXBhY3Qgc3RyaW5naWZ5IC0tIE1vZGlmaWVkIGJ5IEthbml0IFdvbmdzdXBoYXNhd2F0LiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5pdHcvanNvbjNcbiAqXG4gKiBGb3JrZWQgZnJvbSBKU09OIHYzLjMuMiB8IGh0dHBzOi8vYmVzdGllanMuZ2l0aHViLmlvL2pzb24zIHwgQ29weXJpZ2h0IDIwMTItMjAxNCwgS2l0IENhbWJyaWRnZSB8IGh0dHA6Ly9raXQubWl0LWxpY2Vuc2Uub3JnXG4gKi9cbjsoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gQSBzZXQgb2YgdHlwZXMgdXNlZCB0byBkaXN0aW5ndWlzaCBvYmplY3RzIGZyb20gcHJpbWl0aXZlcy5cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgIFwiZnVuY3Rpb25cIjogdHJ1ZSxcbiAgICBcIm9iamVjdFwiOiB0cnVlXG4gIH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBgZXhwb3J0c2Agb2JqZWN0IGV4cG9zZWQgYnkgQ29tbW9uSlMgaW1wbGVtZW50YXRpb25zLlxuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIC8vIFVzZSB0aGUgYGdsb2JhbGAgb2JqZWN0IGV4cG9zZWQgYnkgTm9kZSAoaW5jbHVkaW5nIEJyb3dzZXJpZnkgdmlhXG4gIC8vIGBpbnNlcnQtbW9kdWxlLWdsb2JhbHNgKSwgTmFyd2hhbCwgYW5kIFJpbmdvIGFzIHRoZSBkZWZhdWx0IGNvbnRleHQsXG4gIC8vIGFuZCB0aGUgYHdpbmRvd2Agb2JqZWN0IGluIGJyb3dzZXJzLiBSaGlubyBleHBvcnRzIGEgYGdsb2JhbGAgZnVuY3Rpb25cbiAgLy8gaW5zdGVhZC5cbiAgdmFyIHJvb3QgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgfHwgdGhpcyxcbiAgICAgIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiB0eXBlb2YgZ2xvYmFsID09IFwib2JqZWN0XCIgJiYgZ2xvYmFsO1xuXG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsW1wiZ2xvYmFsXCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJ3aW5kb3dcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcInNlbGZcIl0gPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvLyBQdWJsaWM6IEluaXRpYWxpemVzIEpTT04gMyB1c2luZyB0aGUgZ2l2ZW4gYGNvbnRleHRgIG9iamVjdCwgYXR0YWNoaW5nIHRoZVxuICAvLyBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBmdW5jdGlvbnMgdG8gdGhlIHNwZWNpZmllZCBgZXhwb3J0c2Agb2JqZWN0LlxuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCwgZXhwb3J0cykge1xuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuICAgIGV4cG9ydHMgfHwgKGV4cG9ydHMgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuXG4gICAgLy8gTmF0aXZlIGNvbnN0cnVjdG9yIGFsaWFzZXMuXG4gICAgdmFyIE51bWJlciA9IGNvbnRleHRbXCJOdW1iZXJcIl0gfHwgcm9vdFtcIk51bWJlclwiXSxcbiAgICAgICAgU3RyaW5nID0gY29udGV4dFtcIlN0cmluZ1wiXSB8fCByb290W1wiU3RyaW5nXCJdLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0W1wiT2JqZWN0XCJdIHx8IHJvb3RbXCJPYmplY3RcIl0sXG4gICAgICAgIERhdGUgPSBjb250ZXh0W1wiRGF0ZVwiXSB8fCByb290W1wiRGF0ZVwiXSxcbiAgICAgICAgU3ludGF4RXJyb3IgPSBjb250ZXh0W1wiU3ludGF4RXJyb3JcIl0gfHwgcm9vdFtcIlN5bnRheEVycm9yXCJdLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0W1wiVHlwZUVycm9yXCJdIHx8IHJvb3RbXCJUeXBlRXJyb3JcIl0sXG4gICAgICAgIE1hdGggPSBjb250ZXh0W1wiTWF0aFwiXSB8fCByb290W1wiTWF0aFwiXSxcbiAgICAgICAgbmF0aXZlSlNPTiA9IGNvbnRleHRbXCJKU09OXCJdIHx8IHJvb3RbXCJKU09OXCJdO1xuXG4gICAgLy8gRGVsZWdhdGUgdG8gdGhlIG5hdGl2ZSBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgaWYgKHR5cGVvZiBuYXRpdmVKU09OID09IFwib2JqZWN0XCIgJiYgbmF0aXZlSlNPTikge1xuICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICAgIGV4cG9ydHMucGFyc2UgPSBuYXRpdmVKU09OLnBhcnNlO1xuICAgIH1cblxuICAgIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gICAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgZ2V0Q2xhc3MgPSBvYmplY3RQcm90by50b1N0cmluZyxcbiAgICAgICAgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gICAgdmFyIGlzRXh0ZW5kZWQgPSBuZXcgRGF0ZSgtMzUwOTgyNzMzNDU3MzI5Mik7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgICAvLyByZXN1bHRzIGZvciBjZXJ0YWluIGRhdGVzIGluIE9wZXJhID49IDEwLjUzLlxuICAgICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgICAvLyBTYWZhcmkgPCAyLjAuMiBzdG9yZXMgdGhlIGludGVybmFsIG1pbGxpc2Vjb25kIHRpbWUgdmFsdWUgY29ycmVjdGx5LFxuICAgICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICAgIGlzRXh0ZW5kZWQuZ2V0VVRDSG91cnMoKSA9PSAxMCAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbnV0ZXMoKSA9PSAzNyAmJiBpc0V4dGVuZGVkLmdldFVUQ1NlY29uZHMoKSA9PSA2ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgPT0gNzA4O1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBzcGVjLWNvbXBsaWFudC4gQmFzZWQgb24gd29yayBieSBLZW4gU255ZGVyLlxuICAgIGZ1bmN0aW9uIGhhcyhuYW1lKSB7XG4gICAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGZlYXR1cmUgdGVzdCByZXN1bHQuXG4gICAgICAgIHJldHVybiBoYXNbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgICBpZiAobmFtZSA9PSBcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKSB7XG4gICAgICAgIC8vIElFIDw9IDcgZG9lc24ndCBzdXBwb3J0IGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyB1c2luZyBzcXVhcmVcbiAgICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gXCJhXCJbMF0gIT0gXCJhXCI7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT0gXCJqc29uXCIpIHtcbiAgICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAgIC8vIHN1cHBvcnRlZC5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBoYXMoXCJqc29uLXN0cmluZ2lmeVwiKSAmJiBoYXMoXCJqc29uLXBhcnNlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHZhbHVlLCBzZXJpYWxpemVkID0gJ3tcImFcIjpbMSx0cnVlLGZhbHNlLG51bGwsXCJcXFxcdTAwMDBcXFxcYlxcXFxuXFxcXGZcXFxcclxcXFx0XCJdfSc7XG4gICAgICAgIC8vIFRlc3QgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgICAgdmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5LCBzdHJpbmdpZnlTdXBwb3J0ZWQgPSB0eXBlb2Ygc3RyaW5naWZ5ID09IFwiZnVuY3Rpb25cIiAmJiBpc0V4dGVuZGVkO1xuICAgICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIC8vIEEgdGVzdCBmdW5jdGlvbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSBgdG9KU09OYCBtZXRob2QuXG4gICAgICAgICAgICAodmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSkudG9KU09OID0gdmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggMy4xYjEgYW5kIGIyIHNlcmlhbGl6ZSBzdHJpbmcsIG51bWJlciwgYW5kIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAvLyBwcmltaXRpdmVzIGFzIG9iamVjdCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyLCBhbmQgSlNPTiAyIHNlcmlhbGl6ZSB3cmFwcGVkIHByaW1pdGl2ZXMgYXMgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBTdHJpbmcoKSkgPT0gJ1wiXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIHZhbHVlIGlzIGBudWxsYCwgYHVuZGVmaW5lZGAsIG9yXG4gICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBgdG9KU09OYCBwcm9wZXJ0aWVzIGFzIHdlbGwsICp1bmxlc3MqIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhpbiBhbiBvYmplY3Qgb3IgYXJyYXkpLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gSUUgOCBzZXJpYWxpemVzIGB1bmRlZmluZWRgIGFzIGBcInVuZGVmaW5lZFwiYC4gU2FmYXJpIDw9IDUuMS43IGFuZFxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIzIHBhc3MgdGhpcyB0ZXN0LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS43IGFuZCBGRiAzLjFiMyB0aHJvdyBgRXJyb3JgcyBhbmQgYFR5cGVFcnJvcmBzLFxuICAgICAgICAgICAgICAgIC8vIHJlc3BlY3RpdmVseSwgaWYgdGhlIHZhbHVlIGlzIG9taXR0ZWQgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG5vdCBhIG51bWJlcixcbiAgICAgICAgICAgICAgICAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3QsIEJvb2xlYW4sIG9yIGBudWxsYCBsaXRlcmFsLiBUaGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMuIFlVSSAzLjAuMGIxIGlnbm9yZXMgY3VzdG9tIGB0b0pTT05gXG4gICAgICAgICAgICAgICAgLy8gbWV0aG9kcyBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdmFsdWVdKSA9PSBcIlsxXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIHNlcmlhbGl6ZXMgYFt1bmRlZmluZWRdYCBhcyBgXCJbXVwiYCBpbnN0ZWFkIG9mXG4gICAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWZdKSA9PSBcIltudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gWVVJIDMuMC4wYjEgZmFpbHMgdG8gc2VyaWFsaXplIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiBoYWx0cyBzZXJpYWxpemF0aW9uIGlmIGFuIGFycmF5IGNvbnRhaW5zIGEgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgLy8gYFsxLCB0cnVlLCBnZXRDbGFzcywgMV1gIHNlcmlhbGl6ZXMgYXMgXCJbMSx0cnVlLF0sXCIuIEZGIDMuMWIzXG4gICAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBkZWZpbmUgY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZiwgZ2V0Q2xhc3MsIG51bGxdKSA9PSBcIltudWxsLG51bGwsbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgICAgLy8gd2hlcmUgY2hhcmFjdGVyIGVzY2FwZSBjb2RlcyBhcmUgZXhwZWN0ZWQgKGUuZy4sIGBcXGJgID0+IGBcXHUwMDA4YCkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHsgXCJhXCI6IFt2YWx1ZSwgdHJ1ZSwgZmFsc2UsIG51bGwsIFwiXFx4MDBcXGJcXG5cXGZcXHJcXHRcIl0gfSkgPT0gc2VyaWFsaXplZCAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCwgdmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbMSwgMl0sIG51bGwsIDEpID09IFwiW1xcbiAxLFxcbiAyXFxuXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAgIC8vIHNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTguNjRlMTUpKSA9PSAnXCItMjcxODIxLTA0LTIwVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSg4LjY0ZTE1KSkgPT0gJ1wiKzI3NTc2MC0wOS0xM1QwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCA8PSAxMS4wIGluY29ycmVjdGx5IHNlcmlhbGl6ZXMgeWVhcnMgcHJpb3IgdG8gMCBhcyBuZWdhdGl2ZVxuICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC02MjE5ODc1NTJlNSkpID09ICdcIi0wMDAwMDEtMDEtMDFUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNSBhbmQgT3BlcmEgPj0gMTAuNTMgaW5jb3JyZWN0bHkgc2VyaWFsaXplIG1pbGxpc2Vjb25kXG4gICAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtMSkpID09ICdcIjE5NjktMTItMzFUMjM6NTk6NTkuOTk5WlwiJztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBgSlNPTi5wYXJzZWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgICAgdmFyIHBhcnNlID0gZXhwb3J0cy5wYXJzZTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGEgYmFyZSBsaXRlcmFsIGlzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgICAgLy8gYSBzdHJpbmcgcHJpb3IgdG8gcGFyc2luZy5cbiAgICAgICAgICAgICAgaWYgKHBhcnNlKFwiMFwiKSA9PT0gMCAmJiAhcGFyc2UoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnNlKHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZVN1cHBvcnRlZCA9IHZhbHVlW1wiYVwiXS5sZW5ndGggPT0gNSAmJiB2YWx1ZVtcImFcIl1bMF0gPT09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjIgYW5kIEZGIDMuMWIxIGFsbG93IHVuZXNjYXBlZCB0YWJzIGluIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAgYW5kIDQuMC4xIGFsbG93IGxlYWRpbmcgYCtgIHNpZ25zIGFuZCBsZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBwb2ludHMuIEZGIDQuMCwgNC4wLjEsIGFuZCBJRSA5LTEwIGFsc28gYWxsb3dcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIwMVwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBwb2ludHMuIFRoZXNlIGVudmlyb25tZW50cywgYWxvbmcgd2l0aCBGRiAzLjFiMSBhbmQgMixcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGFsbG93IHRyYWlsaW5nIGNvbW1hcyBpbiBKU09OIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgICB9XG5cbiAgICBpZiAodHJ1ZSkgeyAvLyB1c2VkIHRvIGJlICFoYXMoXCJqc29uXCIpXG4gICAgICAvLyBDb21tb24gYFtbQ2xhc3NdXWAgbmFtZSBhbGlhc2VzLlxuICAgICAgdmFyIGZ1bmN0aW9uQ2xhc3MgPSBcIltvYmplY3QgRnVuY3Rpb25dXCIsXG4gICAgICAgICAgZGF0ZUNsYXNzID0gXCJbb2JqZWN0IERhdGVdXCIsXG4gICAgICAgICAgbnVtYmVyQ2xhc3MgPSBcIltvYmplY3QgTnVtYmVyXVwiLFxuICAgICAgICAgIHN0cmluZ0NsYXNzID0gXCJbb2JqZWN0IFN0cmluZ11cIixcbiAgICAgICAgICBhcnJheUNsYXNzID0gXCJbb2JqZWN0IEFycmF5XVwiLFxuICAgICAgICAgIGJvb2xlYW5DbGFzcyA9IFwiW29iamVjdCBCb29sZWFuXVwiO1xuXG4gICAgICAvLyBEZXRlY3QgaW5jb21wbGV0ZSBzdXBwb3J0IGZvciBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgYnkgaW5kZXguXG4gICAgICB2YXIgY2hhckluZGV4QnVnZ3kgPSBoYXMoXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIik7XG5cbiAgICAgIC8vIERlZmluZSBhZGRpdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyBpZiB0aGUgYERhdGVgIG1ldGhvZHMgYXJlIGJ1Z2d5LlxuICAgICAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgICAgIC8vIEEgbWFwcGluZyBiZXR3ZWVuIHRoZSBtb250aHMgb2YgdGhlIHllYXIgYW5kIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuXG4gICAgICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgICAgIHZhciBNb250aHMgPSBbMCwgMzEsIDU5LCA5MCwgMTIwLCAxNTEsIDE4MSwgMjEyLCAyNDMsIDI3MywgMzA0LCAzMzRdO1xuICAgICAgICAvLyBJbnRlcm5hbDogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlbiB0aGUgVW5peCBlcG9jaCBhbmQgdGhlXG4gICAgICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgICAgIHZhciBnZXREYXkgPSBmdW5jdGlvbiAoeWVhciwgbW9udGgpIHtcbiAgICAgICAgICByZXR1cm4gTW9udGhzW21vbnRoXSArIDM2NSAqICh5ZWFyIC0gMTk3MCkgKyBmbG9vcigoeWVhciAtIDE5NjkgKyAobW9udGggPSArKG1vbnRoID4gMSkpKSAvIDQpIC0gZmxvb3IoKHllYXIgLSAxOTAxICsgbW9udGgpIC8gMTAwKSArIGZsb29yKCh5ZWFyIC0gMTYwMSArIG1vbnRoKSAvIDQwMCk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIGlmIGEgcHJvcGVydHkgaXMgYSBkaXJlY3QgcHJvcGVydHkgb2YgdGhlIGdpdmVuXG4gICAgICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgICAgIGlmICghKGlzUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgICAgIGlmICgobWVtYmVycy5fX3Byb3RvX18gPSBudWxsLCBtZW1iZXJzLl9fcHJvdG9fXyA9IHtcbiAgICAgICAgICAgIC8vIFRoZSAqcHJvdG8qIHByb3BlcnR5IGNhbm5vdCBiZSBzZXQgbXVsdGlwbGUgdGltZXMgaW4gcmVjZW50XG4gICAgICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgICAgICBcInRvU3RyaW5nXCI6IDFcbiAgICAgICAgICB9LCBtZW1iZXJzKS50b1N0cmluZyAhPSBnZXRDbGFzcykge1xuICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIHRoZSBtdXRhYmxlICpwcm90byogcHJvcGVydHkuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgICAgIC8vIG9mIHRoZSBFUyA1LjEgc3BlYykuIFRoZSBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb24gcHJldmVudHMgYW5cbiAgICAgICAgICAgICAgLy8gdW5zYWZlIHRyYW5zZm9ybWF0aW9uIGJ5IHRoZSBDbG9zdXJlIENvbXBpbGVyLlxuICAgICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgICAgICAgICAgdGhpcy5fX3Byb3RvX18gPSBvcmlnaW5hbDtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gbWVtYmVycy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSB0byBzaW11bGF0ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpblxuICAgICAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gKHRoaXMuY29uc3RydWN0b3IgfHwgY29uc3RydWN0b3IpLnByb3RvdHlwZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGlzUHJvcGVydHkuY2FsbCh0aGlzLCBwcm9wZXJ0eSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBOb3JtYWxpemVzIHRoZSBgZm9yLi4uaW5gIGl0ZXJhdGlvbiBhbGdvcml0aG0gYWNyb3NzXG4gICAgICAvLyBlbnZpcm9ubWVudHMuIEVhY2ggZW51bWVyYXRlZCBrZXkgaXMgeWllbGRlZCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uXG4gICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNpemUgPSAwLCBQcm9wZXJ0aWVzLCBtZW1iZXJzLCBwcm9wZXJ0eTtcblxuICAgICAgICAvLyBUZXN0cyBmb3IgYnVncyBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudCdzIGBmb3IuLi5pbmAgYWxnb3JpdGhtLiBUaGVcbiAgICAgICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAgICAgLy8gYE9iamVjdC5wcm90b3R5cGVgIGluIG9sZGVyIHZlcnNpb25zIG9mIElFLCBOZXRzY2FwZSwgYW5kIE1vemlsbGEuXG4gICAgICAgIChQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgICAgIH0pLnByb3RvdHlwZS52YWx1ZU9mID0gMDtcblxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIGBQcm9wZXJ0aWVzYCBjbGFzcy5cbiAgICAgICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gbWVtYmVycykge1xuICAgICAgICAgIC8vIElnbm9yZSBhbGwgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgUHJvcGVydGllcyA9IG1lbWJlcnMgPSBudWxsO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgaXRlcmF0aW9uIGFsZ29yaXRobS5cbiAgICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgICAgLy8gQSBsaXN0IG9mIG5vbi1lbnVtZXJhYmxlIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIG1lbWJlcnMgPSBbXCJ2YWx1ZU9mXCIsIFwidG9TdHJpbmdcIiwgXCJ0b0xvY2FsZVN0cmluZ1wiLCBcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsIFwiaXNQcm90b3R5cGVPZlwiLCBcImhhc093blByb3BlcnR5XCIsIFwiY29uc3RydWN0b3JcIl07XG4gICAgICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAgICAgLy8gcHJvcGVydGllcy5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBsZW5ndGg7XG4gICAgICAgICAgICB2YXIgaGFzUHJvcGVydHkgPSAhaXNGdW5jdGlvbiAmJiB0eXBlb2Ygb2JqZWN0LmNvbnN0cnVjdG9yICE9IFwiZnVuY3Rpb25cIiAmJiBvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5XSAmJiBvYmplY3QuaGFzT3duUHJvcGVydHkgfHwgaXNQcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIEdlY2tvIDw9IDEuMCBlbnVtZXJhdGVzIHRoZSBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgdW5kZXJcbiAgICAgICAgICAgICAgLy8gY2VydGFpbiBjb25kaXRpb25zOyBJRSBkb2VzIG5vdC5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBtZW1iZXJzLmxlbmd0aDsgcHJvcGVydHkgPSBtZW1iZXJzWy0tbGVuZ3RoXTsgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiBjYWxsYmFjayhwcm9wZXJ0eSkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoc2l6ZSA9PSAyKSB7XG4gICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC40IGVudW1lcmF0ZXMgc2hhZG93ZWQgcHJvcGVydGllcyB0d2ljZS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNldCBvZiBpdGVyYXRlZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIFN0b3JlIGVhY2ggcHJvcGVydHkgbmFtZSB0byBwcmV2ZW50IGRvdWJsZSBlbnVtZXJhdGlvbi4gVGhlXG4gICAgICAgICAgICAgIC8vIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyBpcyBub3QgZW51bWVyYXRlZCBkdWUgdG8gY3Jvc3MtXG4gICAgICAgICAgICAgIC8vIGVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiAhaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSAmJiAobWVtYmVyc1twcm9wZXJ0eV0gPSAxKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIGJ1Z3MgZGV0ZWN0ZWQ7IHVzZSB0aGUgc3RhbmRhcmQgYGZvci4uLmluYCBhbGdvcml0aG0uXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgaXNDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmICEoaXNDb25zdHJ1Y3RvciA9IHByb3BlcnR5ID09PSBcImNvbnN0cnVjdG9yXCIpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSBkdWUgdG9cbiAgICAgICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yIHx8IGlzUHJvcGVydHkuY2FsbChvYmplY3QsIChwcm9wZXJ0eSA9IFwiY29uc3RydWN0b3JcIikpKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgLy8gUHVibGljOiBTZXJpYWxpemVzIGEgSmF2YVNjcmlwdCBgdmFsdWVgIGFzIGEgSlNPTiBzdHJpbmcuIFRoZSBvcHRpb25hbFxuICAgICAgLy8gYGZpbHRlcmAgYXJndW1lbnQgbWF5IHNwZWNpZnkgZWl0aGVyIGEgZnVuY3Rpb24gdGhhdCBhbHRlcnMgaG93IG9iamVjdCBhbmRcbiAgICAgIC8vIGFycmF5IG1lbWJlcnMgYXJlIHNlcmlhbGl6ZWQsIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIG51bWJlcnMgdGhhdFxuICAgICAgLy8gaW5kaWNhdGVzIHdoaWNoIHByb3BlcnRpZXMgc2hvdWxkIGJlIHNlcmlhbGl6ZWQuIFRoZSBvcHRpb25hbCBgd2lkdGhgXG4gICAgICAvLyBhcmd1bWVudCBtYXkgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIG51bWJlciB0aGF0IHNwZWNpZmllcyB0aGUgaW5kZW50YXRpb25cbiAgICAgIC8vIGxldmVsIG9mIHRoZSBvdXRwdXQuXG4gICAgICBpZiAodHJ1ZSkge1xuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgRXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXFxcXFwiJyxcbiAgICAgICAgICA4OiBcIlxcXFxiXCIsXG4gICAgICAgICAgMTI6IFwiXFxcXGZcIixcbiAgICAgICAgICAxMDogXCJcXFxcblwiLFxuICAgICAgICAgIDEzOiBcIlxcXFxyXCIsXG4gICAgICAgICAgOTogXCJcXFxcdFwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gICAgICAgIC8vIGxlbmd0aCBpcyBhdCBsZWFzdCBlcXVhbCB0byBgd2lkdGhgLiBUaGUgYHdpZHRoYCBtdXN0IGJlIDw9IDYuXG4gICAgICAgIHZhciBsZWFkaW5nWmVyb2VzID0gXCIwMDAwMDBcIjtcbiAgICAgICAgdmFyIHRvUGFkZGVkU3RyaW5nID0gZnVuY3Rpb24gKHdpZHRoLCB2YWx1ZSkge1xuICAgICAgICAgIC8vIFRoZSBgfHwgMGAgZXhwcmVzc2lvbiBpcyBuZWNlc3NhcnkgdG8gd29yayBhcm91bmQgYSBidWcgaW5cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgd2hlcmUgYDAgPT0gLTBgLCBidXQgYFN0cmluZygtMCkgIT09IFwiMFwiYC5cbiAgICAgICAgICByZXR1cm4gKGxlYWRpbmdaZXJvZXMgKyAodmFsdWUgfHwgMCkpLnNsaWNlKC13aWR0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IERvdWJsZS1xdW90ZXMgYSBzdHJpbmcgYHZhbHVlYCwgcmVwbGFjaW5nIGFsbCBBU0NJSSBjb250cm9sXG4gICAgICAgIC8vIGNoYXJhY3RlcnMgKGNoYXJhY3RlcnMgd2l0aCBjb2RlIHVuaXQgdmFsdWVzIGJldHdlZW4gMCBhbmQgMzEpIHdpdGhcbiAgICAgICAgLy8gdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFF1b3RlKHZhbHVlKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cbiAgICAgICAgdmFyIHVuaWNvZGVQcmVmaXggPSBcIlxcXFx1MDBcIjtcbiAgICAgICAgdmFyIHF1b3RlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9ICdcIicsIGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoLCB1c2VDaGFySW5kZXggPSAhY2hhckluZGV4QnVnZ3kgfHwgbGVuZ3RoID4gMTA7XG4gICAgICAgICAgdmFyIHN5bWJvbHMgPSB1c2VDaGFySW5kZXggJiYgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuc3BsaXQoXCJcIikgOiB2YWx1ZSk7XG4gICAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB2YXIgY2hhckNvZGUgPSB2YWx1ZS5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBjaGFyYWN0ZXIgaXMgYSBjb250cm9sIGNoYXJhY3RlciwgYXBwZW5kIGl0cyBVbmljb2RlIG9yXG4gICAgICAgICAgICAvLyBzaG9ydGhhbmQgZXNjYXBlIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDg6IGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMjogY2FzZSAxMzogY2FzZSAzNDogY2FzZSA5MjpcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gRXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1bmljb2RlUHJlZml4ICsgdG9QYWRkZWRTdHJpbmcoMiwgY2hhckNvZGUudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdXNlQ2hhckluZGV4ID8gc3ltYm9sc1tpbmRleF0gOiB2YWx1ZS5jaGFyQXQoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0ICsgJ1wiJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyBhbiBvYmplY3QuIEltcGxlbWVudHMgdGhlXG4gICAgICAgIC8vIGBTdHIoa2V5LCBob2xkZXIpYCwgYEpPKHZhbHVlKWAsIGFuZCBgSkEodmFsdWUpYCBvcGVyYXRpb25zLlxuICAgICAgICB2YXIgc2VyaWFsaXplID0gZnVuY3Rpb24gKHByb3BlcnR5LCBvYmplY3QsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2ssIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgcmVzdWx0O1xuXG4gICAgICAgICAgbWF4TGluZUxlbmd0aCA9IG1heExpbmVMZW5ndGggfHwgMDtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBOZWNlc3NhcnkgZm9yIGhvc3Qgb2JqZWN0IHN1cHBvcnQuXG4gICAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGRhdGVDbGFzcyAmJiAhaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGVzIGFyZSBzZXJpYWxpemVkIGFjY29yZGluZyB0byB0aGUgYERhdGUjdG9KU09OYCBtZXRob2RcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuOS41LjQ0LiBTZWUgc2VjdGlvbiAxNS45LjEuMTVcbiAgICAgICAgICAgICAgICAvLyBmb3IgdGhlIElTTyA4NjAxIGRhdGUgdGltZSBzdHJpbmcgZm9ybWF0LlxuICAgICAgICAgICAgICAgIGlmIChnZXREYXkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbXB1dGUgdGhlIHllYXIsIG1vbnRoLCBkYXRlLCBob3VycywgbWludXRlcyxcbiAgICAgICAgICAgICAgICAgIC8vIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgaWYgdGhlIGBnZXRVVEMqYCBtZXRob2RzIGFyZVxuICAgICAgICAgICAgICAgICAgLy8gYnVnZ3kuIEFkYXB0ZWQgZnJvbSBAWWFmZmxlJ3MgYGRhdGUtc2hpbWAgcHJvamVjdC5cbiAgICAgICAgICAgICAgICAgIGRhdGUgPSBmbG9vcih2YWx1ZSAvIDg2NGU1KTtcbiAgICAgICAgICAgICAgICAgIGZvciAoeWVhciA9IGZsb29yKGRhdGUgLyAzNjUuMjQyNSkgKyAxOTcwIC0gMTsgZ2V0RGF5KHllYXIgKyAxLCAwKSA8PSBkYXRlOyB5ZWFyKyspO1xuICAgICAgICAgICAgICAgICAgZm9yIChtb250aCA9IGZsb29yKChkYXRlIC0gZ2V0RGF5KHllYXIsIDApKSAvIDMwLjQyKTsgZ2V0RGF5KHllYXIsIG1vbnRoICsgMSkgPD0gZGF0ZTsgbW9udGgrKyk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gMSArIGRhdGUgLSBnZXREYXkoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGB0aW1lYCB2YWx1ZSBzcGVjaWZpZXMgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkgKHNlZSBFU1xuICAgICAgICAgICAgICAgICAgLy8gNS4xIHNlY3Rpb24gMTUuOS4xLjIpLiBUaGUgZm9ybXVsYSBgKEEgJSBCICsgQikgJSBCYCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgICAvLyB0byBjb21wdXRlIGBBIG1vZHVsbyBCYCwgYXMgdGhlIGAlYCBvcGVyYXRvciBkb2VzIG5vdFxuICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZCB0byB0aGUgYG1vZHVsb2Agb3BlcmF0aW9uIGZvciBuZWdhdGl2ZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgICAgdGltZSA9ICh2YWx1ZSAlIDg2NGU1ICsgODY0ZTUpICUgODY0ZTU7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgYXJlIG9idGFpbmVkIGJ5XG4gICAgICAgICAgICAgICAgICAvLyBkZWNvbXBvc2luZyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheS4gU2VlIHNlY3Rpb24gMTUuOS4xLjEwLlxuICAgICAgICAgICAgICAgICAgaG91cnMgPSBmbG9vcih0aW1lIC8gMzZlNSkgJSAyNDtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBmbG9vcih0aW1lIC8gNmU0KSAlIDYwO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IGZsb29yKHRpbWUgLyAxZTMpICUgNjA7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB0aW1lICUgMWUzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB5ZWFyID0gdmFsdWUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICAgIG1vbnRoID0gdmFsdWUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSB2YWx1ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgICAgICAgICAgICBob3VycyA9IHZhbHVlLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gdmFsdWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IHZhbHVlLmdldFVUQ1NlY29uZHMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHZhbHVlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMgY29ycmVjdGx5LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHllYXIgPD0gMCB8fCB5ZWFyID49IDFlNCA/ICh5ZWFyIDwgMCA/IFwiLVwiIDogXCIrXCIpICsgdG9QYWRkZWRTdHJpbmcoNiwgeWVhciA8IDAgPyAteWVhciA6IHllYXIpIDogdG9QYWRkZWRTdHJpbmcoNCwgeWVhcikpICtcbiAgICAgICAgICAgICAgICAgIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbW9udGggKyAxKSArIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgZGF0ZSkgK1xuICAgICAgICAgICAgICAgICAgLy8gTW9udGhzLCBkYXRlcywgaG91cnMsIG1pbnV0ZXMsIGFuZCBzZWNvbmRzIHNob3VsZCBoYXZlIHR3b1xuICAgICAgICAgICAgICAgICAgLy8gZGlnaXRzOyBtaWxsaXNlY29uZHMgc2hvdWxkIGhhdmUgdGhyZWUuXG4gICAgICAgICAgICAgICAgICBcIlRcIiArIHRvUGFkZGVkU3RyaW5nKDIsIGhvdXJzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbWludXRlcykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHNlY29uZHMpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNS4wLCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgICAgXCIuXCIgKyB0b1BhZGRlZFN0cmluZygzLCBtaWxsaXNlY29uZHMpICsgXCJaXCI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS50b0pTT04gPT0gXCJmdW5jdGlvblwiICYmICgoY2xhc3NOYW1lICE9IG51bWJlckNsYXNzICYmIGNsYXNzTmFtZSAhPSBzdHJpbmdDbGFzcyAmJiBjbGFzc05hbWUgIT0gYXJyYXlDbGFzcykgfHwgaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkpIHtcbiAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIGFkZHMgbm9uLXN0YW5kYXJkIGB0b0pTT05gIG1ldGhvZHMgdG8gdGhlXG4gICAgICAgICAgICAgIC8vIGBOdW1iZXJgLCBgU3RyaW5nYCwgYERhdGVgLCBhbmQgYEFycmF5YCBwcm90b3R5cGVzLiBKU09OIDNcbiAgICAgICAgICAgICAgLy8gaWdub3JlcyBhbGwgYHRvSlNPTmAgbWV0aG9kcyBvbiB0aGVzZSBvYmplY3RzIHVubGVzcyB0aGV5IGFyZVxuICAgICAgICAgICAgICAvLyBkZWZpbmVkIGRpcmVjdGx5IG9uIGFuIGluc3RhbmNlLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvSlNPTihwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gSWYgYSByZXBsYWNlbWVudCBmdW5jdGlvbiB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gb2J0YWluIHRoZSB2YWx1ZVxuICAgICAgICAgICAgLy8gZm9yIHNlcmlhbGl6YXRpb24uXG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrLmNhbGwob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBib29sZWFuQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW5zIGFyZSByZXByZXNlbnRlZCBsaXRlcmFsbHkuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArIHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAvLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIGBJbmZpbml0eWAgYW5kIGBOYU5gIGFyZSBzZXJpYWxpemVkIGFzXG4gICAgICAgICAgICAvLyBgXCJudWxsXCJgLlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDAgPyBcIlwiICsgdmFsdWUgOiBcIm51bGxcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgICAgICAgIHJldHVybiBxdW90ZShcIlwiICsgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGlzIGlzIGEgbGluZWFyIHNlYXJjaDsgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIC8vIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZiB1bmlxdWUgbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHN0YWNrLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgIGlmIChzdGFja1tsZW5ndGhdID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEN5Y2xpYyBzdHJ1Y3R1cmVzIGNhbm5vdCBiZSBzZXJpYWxpemVkIGJ5IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCB0aGUgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbCBhbmQgaW5kZW50IG9uZSBhZGRpdGlvbmFsIGxldmVsLlxuICAgICAgICAgICAgcHJlZml4ID0gaW5kZW50YXRpb247XG4gICAgICAgICAgICBpbmRlbnRhdGlvbiArPSB3aGl0ZXNwYWNlO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgcmVzdWx0O1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgYXJyYXkgZWxlbWVudHMuXG4gICAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHNlcmlhbGl6ZShpbmRleCwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50ID09PSB1bmRlZiA/IFwibnVsbFwiIDogZWxlbWVudDtcbiAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4ID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIltcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwiXVwiIDpcbiAgICAgICAgICAgICAgICAgIFwiW1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwiXVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJbXVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCBpbmRleD0wO1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0IG1lbWJlcnMuIE1lbWJlcnMgYXJlIHNlbGVjdGVkIGZyb21cbiAgICAgICAgICAgICAgLy8gZWl0aGVyIGEgdXNlci1zcGVjaWZpZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcywgb3IgdGhlIG9iamVjdFxuICAgICAgICAgICAgICAvLyBpdHNlbGYuXG4gICAgICAgICAgICAgIGZvckVhY2gocHJvcGVydGllcyB8fCB2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCwgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFjY29yZGluZyB0byBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zOiBcIklmIGBnYXBgIHt3aGl0ZXNwYWNlfVxuICAgICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBlbXB0eSBzdHJpbmcsIGxldCBgbWVtYmVyYCB7cXVvdGUocHJvcGVydHkpICsgXCI6XCJ9XG4gICAgICAgICAgICAgICAgICAvLyBiZSB0aGUgY29uY2F0ZW5hdGlvbiBvZiBgbWVtYmVyYCBhbmQgdGhlIGBzcGFjZWAgY2hhcmFjdGVyLlwiXG4gICAgICAgICAgICAgICAgICAvLyBUaGUgXCJgc3BhY2VgIGNoYXJhY3RlclwiIHJlZmVycyB0byB0aGUgbGl0ZXJhbCBzcGFjZVxuICAgICAgICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBub3QgdGhlIGBzcGFjZWAge3dpZHRofSBhcmd1bWVudCBwcm92aWRlZCB0b1xuICAgICAgICAgICAgICAgICAgLy8gYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXgrKyA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIntcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwifVwiIDpcbiAgICAgICAgICAgICAgICAgIFwie1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwifVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJ7fVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBvYmplY3QgZnJvbSB0aGUgdHJhdmVyc2VkIG9iamVjdCBzdGFjay5cbiAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5zdHJpbmdpZnlgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cblxuICAgICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgsIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgd2hpdGVzcGFjZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIGNsYXNzTmFtZTtcbiAgICAgICAgICBpZiAob2JqZWN0VHlwZXNbdHlwZW9mIGZpbHRlcl0gJiYgZmlsdGVyKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwoZmlsdGVyKSkgPT0gZnVuY3Rpb25DbGFzcykge1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZpbHRlcjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgcHJvcGVydHkgbmFtZXMgYXJyYXkgaW50byBhIG1ha2VzaGlmdCBzZXQuXG4gICAgICAgICAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBmaWx0ZXIubGVuZ3RoLCB2YWx1ZTsgaW5kZXggPCBsZW5ndGg7IHZhbHVlID0gZmlsdGVyW2luZGV4KytdLCAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpKSwgY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzIHx8IGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykgJiYgKHByb3BlcnRpZXNbdmFsdWVdID0gMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAod2lkdGgpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh3aWR0aCkpID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIGB3aWR0aGAgdG8gYW4gaW50ZWdlciBhbmQgY3JlYXRlIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAgICAgICAgICAgICAgLy8gYHdpZHRoYCBudW1iZXIgb2Ygc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAod2hpdGVzcGFjZSA9IFwiXCIsIHdpZHRoID4gMTAgJiYgKHdpZHRoID0gMTApOyB3aGl0ZXNwYWNlLmxlbmd0aCA8IHdpZHRoOyB3aGl0ZXNwYWNlICs9IFwiIFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgICAgd2hpdGVzcGFjZSA9IHdpZHRoLmxlbmd0aCA8PSAxMCA/IHdpZHRoIDogd2lkdGguc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgZGlzY2FyZHMgdGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggZW1wdHkgc3RyaW5nIGtleXNcbiAgICAgICAgICAvLyAoYFwiXCJgKSBvbmx5IGlmIHRoZXkgYXJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGFuIG9iamVjdCBtZW1iZXIgbGlzdFxuICAgICAgICAgIC8vIChlLmcuLCBgIShcIlwiIGluIHsgXCJcIjogMX0pYCkuXG4gICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZShcIlwiLCAodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSBzb3VyY2UsIHZhbHVlKSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIFwiXCIsIFtdLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBleHBvcnRzLmNvbXBhY3RTdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoKXtcbiAgICAgICAgICByZXR1cm4gZXhwb3J0cy5zdHJpbmdpZnkoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCA2MCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUHVibGljOiBQYXJzZXMgYSBKU09OIHNvdXJjZSBzdHJpbmcuXG4gICAgICBpZiAoIWhhcyhcImpzb24tcGFyc2VcIikpIHtcbiAgICAgICAgdmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciB1bmVzY2FwZWRcbiAgICAgICAgLy8gZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBVbmVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXCInLFxuICAgICAgICAgIDQ3OiBcIi9cIixcbiAgICAgICAgICA5ODogXCJcXGJcIixcbiAgICAgICAgICAxMTY6IFwiXFx0XCIsXG4gICAgICAgICAgMTEwOiBcIlxcblwiLFxuICAgICAgICAgIDEwMjogXCJcXGZcIixcbiAgICAgICAgICAxMTQ6IFwiXFxyXCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogU3RvcmVzIHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgIHZhciBJbmRleCwgU291cmNlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXNldHMgdGhlIHBhcnNlciBzdGF0ZSBhbmQgdGhyb3dzIGEgYFN5bnRheEVycm9yYC5cbiAgICAgICAgdmFyIGFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICB0aHJvdyBTeW50YXhFcnJvcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXR1cm5zIHRoZSBuZXh0IHRva2VuLCBvciBgXCIkXCJgIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWRcbiAgICAgICAgLy8gdGhlIGVuZCBvZiB0aGUgc291cmNlIHN0cmluZy4gQSB0b2tlbiBtYXkgYmUgYSBzdHJpbmcsIG51bWJlciwgYG51bGxgXG4gICAgICAgIC8vIGxpdGVyYWwsIG9yIEJvb2xlYW4gbGl0ZXJhbC5cbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gU291cmNlLCBsZW5ndGggPSBzb3VyY2UubGVuZ3RoLCB2YWx1ZSwgYmVnaW4sIHBvc2l0aW9uLCBpc1NpZ25lZCwgY2hhckNvZGU7XG4gICAgICAgICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEzOiBjYXNlIDMyOlxuICAgICAgICAgICAgICAgIC8vIFNraXAgd2hpdGVzcGFjZSB0b2tlbnMsIGluY2x1ZGluZyB0YWJzLCBjYXJyaWFnZSByZXR1cm5zLCBsaW5lXG4gICAgICAgICAgICAgICAgLy8gZmVlZHMsIGFuZCBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgMTIzOiBjYXNlIDEyNTogY2FzZSA5MTogY2FzZSA5MzogY2FzZSA1ODogY2FzZSA0NDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gKGB7YCwgYH1gLCBgW2AsIGBdYCwgYDpgLCBvciBgLGApIGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjaGFySW5kZXhCdWdneSA/IHNvdXJjZS5jaGFyQXQoSW5kZXgpIDogc291cmNlW0luZGV4XTtcbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgY2FzZSAzNDpcbiAgICAgICAgICAgICAgICAvLyBgXCJgIGRlbGltaXRzIGEgSlNPTiBzdHJpbmc7IGFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZFxuICAgICAgICAgICAgICAgIC8vIGJlZ2luIHBhcnNpbmcgdGhlIHN0cmluZy4gU3RyaW5nIHRva2VucyBhcmUgcHJlZml4ZWQgd2l0aCB0aGVcbiAgICAgICAgICAgICAgICAvLyBzZW50aW5lbCBgQGAgY2hhcmFjdGVyIHRvIGRpc3Rpbmd1aXNoIHRoZW0gZnJvbSBwdW5jdHVhdG9ycyBhbmRcbiAgICAgICAgICAgICAgICAvLyBlbmQtb2Ytc3RyaW5nIHRva2Vucy5cbiAgICAgICAgICAgICAgICBmb3IgKHZhbHVlID0gXCJAXCIsIEluZGV4Kys7IEluZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVbmVzY2FwZWQgQVNDSUkgY29udHJvbCBjaGFyYWN0ZXJzICh0aG9zZSB3aXRoIGEgY29kZSB1bml0XG4gICAgICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhhbiB0aGUgc3BhY2UgY2hhcmFjdGVyKSBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhckNvZGUgPT0gOTIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSByZXZlcnNlIHNvbGlkdXMgKGBcXGApIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYW4gZXNjYXBlZFxuICAgICAgICAgICAgICAgICAgICAvLyBjb250cm9sIGNoYXJhY3RlciAoaW5jbHVkaW5nIGBcImAsIGBcXGAsIGFuZCBgL2ApIG9yIFVuaWNvZGVcbiAgICAgICAgICAgICAgICAgICAgLy8gZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSA5MjogY2FzZSAzNDogY2FzZSA0NzogY2FzZSA5ODogY2FzZSAxMTY6IGNhc2UgMTEwOiBjYXNlIDEwMjogY2FzZSAxMTQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBVbmVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTE3OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYFxcdWAgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgZmlyc3QgY2hhcmFjdGVyIGFuZCB2YWxpZGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgY29kZSBwb2ludC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZ2luID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleCArIDQ7IEluZGV4IDwgcG9zaXRpb247IEluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgdmFsaWQgc2VxdWVuY2UgY29tcHJpc2VzIGZvdXIgaGV4ZGlnaXRzIChjYXNlLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnNlbnNpdGl2ZSkgdGhhdCBmb3JtIGEgc2luZ2xlIGhleGFkZWNpbWFsIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NyB8fCBjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMDIgfHwgY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEFuIHVuZXNjYXBlZCBkb3VibGUtcXVvdGUgY2hhcmFjdGVyIG1hcmtzIHRoZSBlbmQgb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgLy8gc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBPcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiBjYXNlIHdoZXJlIGEgc3RyaW5nIGlzIHZhbGlkLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckNvZGUgPj0gMzIgJiYgY2hhckNvZGUgIT0gOTIgJiYgY2hhckNvZGUgIT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCB0aGUgc3RyaW5nIGFzLWlzLlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kIHJldHVybiB0aGUgcmV2aXZlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnRlcm1pbmF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgbnVtYmVycyBhbmQgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIG5lZ2F0aXZlIHNpZ24sIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhbiBpbnRlZ2VyIG9yIGZsb2F0aW5nLXBvaW50IHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nykge1xuICAgICAgICAgICAgICAgICAgLy8gTGVhZGluZyB6ZXJvZXMgYXJlIGludGVycHJldGVkIGFzIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ4ICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCArIDEpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgb2N0YWwgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgaW50ZWdlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICBmb3IgKDsgSW5kZXggPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgSW5kZXgrKyk7XG4gICAgICAgICAgICAgICAgICAvLyBGbG9hdHMgY2Fubm90IGNvbnRhaW4gYSBsZWFkaW5nIGRlY2ltYWwgcG9pbnQ7IGhvd2V2ZXIsIHRoaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGRlY2ltYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSBleHBvbmVudHMuIFRoZSBgZWAgZGVub3RpbmcgdGhlIGV4cG9uZW50IGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlLlxuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMTAxIHx8IGNoYXJDb2RlID09IDY5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgcGFzdCB0aGUgc2lnbiBmb2xsb3dpbmcgdGhlIGV4cG9uZW50LCBpZiBvbmUgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDMgfHwgY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBleHBvbmVudGlhbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgZW1wdHkgZXhwb25lbnQuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ29lcmNlIHRoZSBwYXJzZWQgdmFsdWUgdG8gYSBKYXZhU2NyaXB0IG51bWJlci5cbiAgICAgICAgICAgICAgICAgIHJldHVybiArc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEEgbmVnYXRpdmUgc2lnbiBtYXkgb25seSBwcmVjZWRlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGFuZCBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDUpID09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcIm51bGxcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnJlY29nbml6ZWQgdG9rZW4uXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSBzZW50aW5lbCBgJGAgY2hhcmFjdGVyIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgIC8vIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLlxuICAgICAgICAgIHJldHVybiBcIiRcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUGFyc2VzIGEgSlNPTiBgdmFsdWVgIHRva2VuLlxuICAgICAgICB2YXIgZ2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdHMsIGhhc01lbWJlcnM7XG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiJFwiKSB7XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSA9PSBcIkBcIikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBhcnNlIG9iamVjdCBhbmQgYXJyYXkgbGl0ZXJhbHMuXG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJbXCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBzcXVhcmUgYnJhY2tldCBtYXJrcyB0aGUgZW5kIG9mIHRoZSBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBhcnJheSBsaXRlcmFsIGNvbnRhaW5zIGVsZW1lbnRzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRpbmcgdGhlIHByZXZpb3VzIGVsZW1lbnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgICAvLyBuZXh0LlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggYXJyYXkgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRWxpc2lvbnMgYW5kIGxlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldCh2YWx1ZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PSBcIntcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIG9iamVjdCwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgb2JqZWN0LlxuICAgICAgICAgICAgICByZXN1bHRzID0ge307XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3NpbmcgY3VybHkgYnJhY2UgbWFya3MgdGhlIGVuZCBvZiB0aGUgb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdG9yLlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIG9iamVjdCBtZW1iZXIuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLCBvYmplY3QgcHJvcGVydHkgbmFtZXMgbXVzdCBiZVxuICAgICAgICAgICAgICAgIC8vIGRvdWJsZS1xdW90ZWQgc3RyaW5ncywgYW5kIGEgYDpgIG11c3Qgc2VwYXJhdGUgZWFjaCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIC8vIG5hbWUgYW5kIHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIiB8fCB0eXBlb2YgdmFsdWUgIT0gXCJzdHJpbmdcIiB8fCAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgIT0gXCJAXCIgfHwgbGV4KCkgIT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNbdmFsdWUuc2xpY2UoMSldID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFVwZGF0ZXMgYSB0cmF2ZXJzZWQgb2JqZWN0IG1lbWJlci5cbiAgICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBlbGVtZW50ID0gd2Fsayhzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHVuZGVmKSB7XG4gICAgICAgICAgICBkZWxldGUgc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291cmNlW3Byb3BlcnR5XSA9IGVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYSBwYXJzZWQgSlNPTiBvYmplY3QsIGludm9raW5nIHRoZVxuICAgICAgICAvLyBgY2FsbGJhY2tgIGZ1bmN0aW9uIGZvciBlYWNoIHZhbHVlLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgV2Fsayhob2xkZXIsIG5hbWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICB2YXIgd2FsayA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtwcm9wZXJ0eV0sIGxlbmd0aDtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGBmb3JFYWNoYCBjYW4ndCBiZSB1c2VkIHRvIHRyYXZlcnNlIGFuIGFycmF5IGluIE9wZXJhIDw9IDguNTRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXRzIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGltcGxlbWVudGF0aW9uIHJldHVybnMgYGZhbHNlYFxuICAgICAgICAgICAgLy8gZm9yIGFycmF5IGluZGljZXMgKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICAgICAgaWYgKGdldENsYXNzLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgZm9yIChsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgbGVuZ3RoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKHNvdXJjZSwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnBhcnNlYC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIGV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc291cmNlLCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciByZXN1bHQsIHZhbHVlO1xuICAgICAgICAgIEluZGV4ID0gMDtcbiAgICAgICAgICBTb3VyY2UgPSBcIlwiICsgc291cmNlO1xuICAgICAgICAgIHJlc3VsdCA9IGdldChsZXgoKSk7XG4gICAgICAgICAgLy8gSWYgYSBKU09OIHN0cmluZyBjb250YWlucyBtdWx0aXBsZSB0b2tlbnMsIGl0IGlzIGludmFsaWQuXG4gICAgICAgICAgaWYgKGxleCgpICE9IFwiJFwiKSB7XG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXNldCB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sgJiYgZ2V0Q2xhc3MuY2FsbChjYWxsYmFjaykgPT0gZnVuY3Rpb25DbGFzcyA/IHdhbGsoKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gcmVzdWx0LCB2YWx1ZSksIFwiXCIsIGNhbGxiYWNrKSA6IHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnRzW1wicnVuSW5Db250ZXh0XCJdID0gcnVuSW5Db250ZXh0O1xuICAgIHJldHVybiBleHBvcnRzO1xuICB9XG5cbiAgaWYgKGZyZWVFeHBvcnRzICYmICFpc0xvYWRlcikge1xuICAgIC8vIEV4cG9ydCBmb3IgQ29tbW9uSlMgZW52aXJvbm1lbnRzLlxuICAgIHJ1bkluQ29udGV4dChyb290LCBmcmVlRXhwb3J0cyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhwb3J0IGZvciB3ZWIgYnJvd3NlcnMgYW5kIEphdmFTY3JpcHQgZW5naW5lcy5cbiAgICB2YXIgbmF0aXZlSlNPTiA9IHJvb3QuSlNPTixcbiAgICAgICAgcHJldmlvdXNKU09OID0gcm9vdFtcIkpTT04zXCJdLFxuICAgICAgICBpc1Jlc3RvcmVkID0gZmFsc2U7XG5cbiAgICB2YXIgSlNPTjMgPSBydW5JbkNvbnRleHQocm9vdCwgKHJvb3RbXCJKU09OM1wiXSA9IHtcbiAgICAgIC8vIFB1YmxpYzogUmVzdG9yZXMgdGhlIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSBnbG9iYWwgYEpTT05gIG9iamVjdCBhbmRcbiAgICAgIC8vIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGBKU09OM2Agb2JqZWN0LlxuICAgICAgXCJub0NvbmZsaWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpc1Jlc3RvcmVkKSB7XG4gICAgICAgICAgaXNSZXN0b3JlZCA9IHRydWU7XG4gICAgICAgICAgcm9vdC5KU09OID0gbmF0aXZlSlNPTjtcbiAgICAgICAgICByb290W1wiSlNPTjNcIl0gPSBwcmV2aW91c0pTT047XG4gICAgICAgICAgbmF0aXZlSlNPTiA9IHByZXZpb3VzSlNPTiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEpTT04zO1xuICAgICAgfVxuICAgIH0pKTtcblxuICAgIHJvb3QuSlNPTiA9IHtcbiAgICAgIFwicGFyc2VcIjogSlNPTjMucGFyc2UsXG4gICAgICBcInN0cmluZ2lmeVwiOiBKU09OMy5zdHJpbmdpZnlcbiAgICB9O1xuICB9XG5cbiAgLy8gRXhwb3J0IGZvciBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuXG4gIGlmIChpc0xvYWRlcikge1xuICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gSlNPTjM7XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCJ3aW5kb3cuICAgICB2bFNjaGVtYSA9IHtcbiAgXCJvbmVPZlwiOiBbXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FeHRlbmRlZFVuaXRTcGVjXCIsXG4gICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NoZW1hIGZvciBhIHVuaXQgVmVnYS1MaXRlIHNwZWNpZmljYXRpb24sIHdpdGggdGhlIHN5bnRhY3RpYyBzdWdhciBleHRlbnNpb25zOlxcblxcbi0gYHJvd2AgYW5kIGBjb2x1bW5gIGFyZSBpbmNsdWRlZCBpbiB0aGUgZW5jb2RpbmcuXFxuXFxuLSAoRnV0dXJlKSBsYWJlbCwgYm94IHBsb3RcXG5cXG5cXG5cXG5Ob3RlOiB0aGUgc3BlYyBjb3VsZCBjb250YWluIGZhY2V0LlwiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0U3BlY1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xheWVyU3BlY1wiXG4gICAgfVxuICBdLFxuICBcImRlZmluaXRpb25zXCI6IHtcbiAgICBcIkV4dGVuZGVkVW5pdFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyayB0eXBlLlxcblxcbk9uZSBvZiBgXFxcImJhclxcXCJgLCBgXFxcImNpcmNsZVxcXCJgLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcInRpY2tcXFwiYCwgYFxcXCJsaW5lXFxcImAsXFxuXFxuYFxcXCJhcmVhXFxcImAsIGBcXFwicG9pbnRcXFwiYCwgYFxcXCJydWxlXFxcImAsIGFuZCBgXFxcInRleHRcXFwiYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImVuY29kaW5nXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0VuY29kaW5nXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEga2V5LXZhbHVlIG1hcHBpbmcgYmV0d2VlbiBlbmNvZGluZyBjaGFubmVscyBhbmQgZGVmaW5pdGlvbiBvZiBmaWVsZHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcInByb2plY3Rpb25cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUHJvamVjdGlvblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJtYXJrXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiTWFya1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiYXJlYVwiLFxuICAgICAgICBcImJhclwiLFxuICAgICAgICBcImxpbmVcIixcbiAgICAgICAgXCJwb2ludFwiLFxuICAgICAgICBcInRleHRcIixcbiAgICAgICAgXCJ0aWNrXCIsXG4gICAgICAgIFwicnVsZVwiLFxuICAgICAgICBcImNpcmNsZVwiLFxuICAgICAgICBcInNxdWFyZVwiLFxuICAgICAgICBcInBhdGhcIixcbiAgICAgICAgXCJlcnJvckJhclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkVuY29kaW5nXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3dcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZlcnRpY2FsIGZhY2V0cyBmb3IgdHJlbGxpcyBwbG90cy5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbHVtblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSG9yaXpvbnRhbCBmYWNldHMgZm9yIHRyZWxsaXMgcGxvdHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ4XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkgY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieDJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlgyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWTIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGZpbGwgb3Igc3Ryb2tlIGNvbG9yIGJhc2VkIG9uIG1hcmsgdHlwZS5cXG5cXG4oQnkgZGVmYXVsdCwgZmlsbCBjb2xvciBmb3IgYGFyZWFgLCBgYmFyYCwgYHRpY2tgLCBgdGV4dGAsIGBjaXJjbGVgLCBhbmQgYHNxdWFyZWAgL1xcblxcbnN0cm9rZSBjb2xvciBmb3IgYGxpbmVgIGFuZCBgcG9pbnRgLilcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3BhY2l0eSBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBjYW4gYmUgYSB2YWx1ZSBvciBpbiBhIHJhbmdlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBwb2ludGAsIGBzcXVhcmVgIGFuZCBgY2lyY2xlYFxcblxcbuKAkyB0aGUgc3ltYm9sIHNpemUsIG9yIHBpeGVsIGFyZWEgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYGJhcmAgYW5kIGB0aWNrYCDigJMgdGhlIGJhciBhbmQgdGljaydzIHNpemUuXFxuXFxuLSBGb3IgYHRleHRgIOKAkyB0aGUgdGV4dCdzIGZvbnQgc2l6ZS5cXG5cXG4tIFNpemUgaXMgY3VycmVudGx5IHVuc3VwcG9ydGVkIGZvciBgbGluZWAgYW5kIGBhcmVhYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzeW1ib2wncyBzaGFwZSAob25seSBmb3IgYHBvaW50YCBtYXJrcykuIFRoZSBzdXBwb3J0ZWQgdmFsdWVzIGFyZVxcblxcbmBcXFwiY2lyY2xlXFxcImAgKGRlZmF1bHQpLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcImNyb3NzXFxcImAsIGBcXFwiZGlhbW9uZFxcXCJgLCBgXFxcInRyaWFuZ2xlLXVwXFxcImAsXFxuXFxub3IgYFxcXCJ0cmlhbmdsZS1kb3duXFxcImAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXRhaWxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZGRpdGlvbmFsIGxldmVscyBvZiBkZXRhaWwgZm9yIGdyb3VwaW5nIGRhdGEgaW4gYWdncmVnYXRlIHZpZXdzIGFuZFxcblxcbmluIGxpbmUgYW5kIGFyZWEgbWFya3Mgd2l0aG91dCBtYXBwaW5nIGRhdGEgdG8gYSBzcGVjaWZpYyB2aXN1YWwgY2hhbm5lbC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBvZiB0aGUgYHRleHRgIG1hcmsuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2VvcGF0aFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGF0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9yZGVyIG9mIGRhdGEgcG9pbnRzIGluIGxpbmUgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkxheWVyIG9yZGVyIGZvciBub24tc3RhY2tlZCBtYXJrcywgb3Igc3RhY2sgb3JkZXIgZm9yIHN0YWNrZWQgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJQb3NpdGlvbkNoYW5uZWxEZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImF4aXNcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0RmllbGRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXhpc1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibGFiZWxBbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9ybWF0dGluZyBwYXR0ZXJuIGZvciBheGlzIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9yaWVudFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzT3JpZW50XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvcmllbnRhdGlvbiBvZiB0aGUgYXhpcy4gT25lIG9mIHRvcCwgYm90dG9tLCBsZWZ0IG9yIHJpZ2h0LiBUaGUgb3JpZW50YXRpb24gY2FuIGJlIHVzZWQgdG8gZnVydGhlciBzcGVjaWFsaXplIHRoZSBheGlzIHR5cGUgKGUuZy4sIGEgeSBheGlzIG9yaWVudGVkIGZvciB0aGUgcmlnaHQgZWRnZSBvZiB0aGUgY2hhcnQpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIGZvciB0aGUgYXhpcy4gU2hvd3MgZmllbGQgbmFtZSBhbmQgaXRzIGZ1bmN0aW9uIGJ5IGRlZmF1bHQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZXNcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaWR0aCBvZiB0aGUgYXhpcyBsaW5lXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYXllclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGluZGljYXRpbmcgaWYgdGhlIGF4aXMgKGFuZCBhbnkgZ3JpZGxpbmVzKSBzaG91bGQgYmUgcGxhY2VkIGFib3ZlIG9yIGJlbG93IHRoZSBkYXRhIG1hcmtzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgYXhpcyBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBheGlzIGxpbmUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBmbGFnIGluZGljYXRlIGlmIGdyaWRsaW5lcyBzaG91bGQgYmUgY3JlYXRlZCBpbiBhZGRpdGlvbiB0byB0aWNrcy4gSWYgYGdyaWRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIFJPVyBhbmQgQ09MLiBGb3IgWCBhbmQgWSwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBxdWFudGl0YXRpdmUgYW5kIHRpbWUgZmllbGRzIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBncmlkbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIGdyaWQgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgb2YgZ3JpZCAodmFsdWUgYmV0d2VlbiBbMCwxXSlcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBncmlkIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJFbmFibGUgb3IgZGlzYWJsZSBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYWxpZ25tZW50IGZvciB0aGUgTGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBiYXNlbGluZSBmb3IgdGhlIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUcnVuY2F0ZSBsYWJlbHMgdGhhdCBhcmUgdG9vIGxvbmcuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIGFuZCBkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInN1YmRpdmlkZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHByb3ZpZGVkLCBzZXRzIHRoZSBudW1iZXIgb2YgbWlub3IgdGlja3MgYmV0d2VlbiBtYWpvciB0aWNrcyAodGhlIHZhbHVlIDkgcmVzdWx0cyBpbiBkZWNpbWFsIHN1YmRpdmlzaW9uKS4gT25seSBhcHBsaWNhYmxlIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZGVzaXJlZCBudW1iZXIgb2YgdGlja3MsIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuIFRoZSByZXN1bHRpbmcgbnVtYmVyIG1heSBiZSBkaWZmZXJlbnQgc28gdGhhdCB2YWx1ZXMgYXJlIFxcXCJuaWNlXFxcIiAobXVsdGlwbGVzIG9mIDIsIDUsIDEwKSBhbmQgbGllIHdpdGhpbiB0aGUgdW5kZXJseWluZyBzY2FsZSdzIHJhbmdlLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBheGlzJ3MgdGljay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSB0aWNrIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSB0aWNrIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIGxhYmVsLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrUGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwYWRkaW5nLCBpbiBwaXhlbHMsIGJldHdlZW4gdGlja3MgYW5kIHRleHQgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciwgbWlub3IgYW5kIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWFqb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWlub3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtaW5vciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplRW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoLCBpbiBwaXhlbHMsIG9mIHRpY2tzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvbnQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2VpZ2h0IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBvZmZzZXQgdmFsdWUgZm9yIHRoZSBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXggbGVuZ3RoIGZvciBheGlzIHRpdGxlIGlmIHRoZSB0aXRsZSBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBmcm9tIHRoZSBmaWVsZCdzIGRlc2NyaXB0aW9uLiBCeSBkZWZhdWx0LCB0aGlzIGlzIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gY2VsbCBzaXplIGFuZCBjaGFyYWN0ZXJXaWR0aCBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNoYXJhY3RlcldpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2hhcmFjdGVyIHdpZHRoIGZvciBhdXRvbWF0aWNhbGx5IGRldGVybWluaW5nIHRpdGxlIG1heCBsZW5ndGguXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGF4aXMgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkF4aXNPcmllbnRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInRvcFwiLFxuICAgICAgICBcInJpZ2h0XCIsXG4gICAgICAgIFwibGVmdFwiLFxuICAgICAgICBcImJvdHRvbVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNjYWxlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlVHlwZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGRvbWFpbiBvZiB0aGUgc2NhbGUsIHJlcHJlc2VudGluZyB0aGUgc2V0IG9mIGRhdGEgdmFsdWVzLiBGb3IgcXVhbnRpdGF0aXZlIGRhdGEsIHRoaXMgY2FuIHRha2UgdGhlIGZvcm0gb2YgYSB0d28tZWxlbWVudCBhcnJheSB3aXRoIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzLiBGb3Igb3JkaW5hbC9jYXRlZ29yaWNhbCBkYXRhLCB0aGlzIG1heSBiZSBhbiBhcnJheSBvZiB2YWxpZCBpbnB1dCB2YWx1ZXMuIFRoZSBkb21haW4gbWF5IGFsc28gYmUgc3BlY2lmaWVkIGJ5IGEgcmVmZXJlbmNlIHRvIGEgZGF0YSBzb3VyY2UuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJhbmdlIG9mIHRoZSBzY2FsZSwgcmVwcmVzZW50aW5nIHRoZSBzZXQgb2YgdmlzdWFsIHZhbHVlcy4gRm9yIG51bWVyaWMgdmFsdWVzLCB0aGUgcmFuZ2UgY2FuIHRha2UgdGhlIGZvcm0gb2YgYSB0d28tZWxlbWVudCBhcnJheSB3aXRoIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzLiBGb3Igb3JkaW5hbCBvciBxdWFudGl6ZWQgZGF0YSwgdGhlIHJhbmdlIG1heSBieSBhbiBhcnJheSBvZiBkZXNpcmVkIG91dHB1dCB2YWx1ZXMsIHdoaWNoIGFyZSBtYXBwZWQgdG8gZWxlbWVudHMgaW4gdGhlIHNwZWNpZmllZCBkb21haW4uIEZvciBvcmRpbmFsIHNjYWxlcyBvbmx5LCB0aGUgcmFuZ2UgY2FuIGJlIGRlZmluZWQgdXNpbmcgYSBEYXRhUmVmOiB0aGUgcmFuZ2UgdmFsdWVzIGFyZSB0aGVuIGRyYXduIGR5bmFtaWNhbGx5IGZyb20gYSBiYWNraW5nIGRhdGEgc2V0LlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHJvdW5kcyBudW1lcmljIG91dHB1dCB2YWx1ZXMgdG8gaW50ZWdlcnMuIFRoaXMgY2FuIGJlIGhlbHBmdWwgZm9yIHNuYXBwaW5nIHRvIHRoZSBwaXhlbCBncmlkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJhbmRTaXplXCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBcHBsaWVzIHNwYWNpbmcgYW1vbmcgb3JkaW5hbCBlbGVtZW50cyBpbiB0aGUgc2NhbGUgcmFuZ2UuIFRoZSBhY3R1YWwgZWZmZWN0IGRlcGVuZHMgb24gaG93IHRoZSBzY2FsZSBpcyBjb25maWd1cmVkLiBJZiB0aGUgX19wb2ludHNfXyBwYXJhbWV0ZXIgaXMgYHRydWVgLCB0aGUgcGFkZGluZyB2YWx1ZSBpcyBpbnRlcnByZXRlZCBhcyBhIG11bHRpcGxlIG9mIHRoZSBzcGFjaW5nIGJldHdlZW4gcG9pbnRzLiBBIHJlYXNvbmFibGUgdmFsdWUgaXMgMS4wLCBzdWNoIHRoYXQgdGhlIGZpcnN0IGFuZCBsYXN0IHBvaW50IHdpbGwgYmUgb2Zmc2V0IGZyb20gdGhlIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWUgYnkgaGFsZiB0aGUgZGlzdGFuY2UgYmV0d2VlbiBwb2ludHMuIE90aGVyd2lzZSwgcGFkZGluZyBpcyB0eXBpY2FsbHkgaW4gdGhlIHJhbmdlIFswLCAxXSBhbmQgY29ycmVzcG9uZHMgdG8gdGhlIGZyYWN0aW9uIG9mIHNwYWNlIGluIHRoZSByYW5nZSBpbnRlcnZhbCB0byBhbGxvY2F0ZSB0byBwYWRkaW5nLiBBIHZhbHVlIG9mIDAuNSBtZWFucyB0aGF0IHRoZSByYW5nZSBiYW5kIHdpZHRoIHdpbGwgYmUgZXF1YWwgdG8gdGhlIHBhZGRpbmcgd2lkdGguIEZvciBtb3JlLCBzZWUgdGhlIFtEMyBvcmRpbmFsIHNjYWxlIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9tYm9zdG9jay9kMy93aWtpL09yZGluYWwtU2NhbGVzKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNsYW1wXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgdmFsdWVzIHRoYXQgZXhjZWVkIHRoZSBkYXRhIGRvbWFpbiBhcmUgY2xhbXBlZCB0byBlaXRoZXIgdGhlIG1pbmltdW0gb3IgbWF4aW11bSByYW5nZSB2YWx1ZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5pY2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBzcGVjaWZpZWQsIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSB2YWx1ZSByYW5nZS4gSWYgc3BlY2lmaWVkIGFzIGEgdHJ1ZSBib29sZWFuLCBtb2RpZmllcyB0aGUgc2NhbGUgZG9tYWluIHRvIHVzZSBhIG1vcmUgaHVtYW4tZnJpZW5kbHkgbnVtYmVyIHJhbmdlIChlLmcuLCA3IGluc3RlYWQgb2YgNi45NikuIElmIHNwZWNpZmllZCBhcyBhIHN0cmluZywgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IHZhbHVlIHJhbmdlLiBGb3IgdGltZSBhbmQgdXRjIHNjYWxlIHR5cGVzIG9ubHksIHRoZSBuaWNlIHZhbHVlIHNob3VsZCBiZSBhIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBkZXNpcmVkIHRpbWUgaW50ZXJ2YWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9OaWNlVGltZVwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImV4cG9uZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2V0cyB0aGUgZXhwb25lbnQgb2YgdGhlIHNjYWxlIHRyYW5zZm9ybWF0aW9uLiBGb3IgcG93IHNjYWxlIHR5cGVzIG9ubHksIG90aGVyd2lzZSBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiemVyb1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIGVuc3VyZXMgdGhhdCBhIHplcm8gYmFzZWxpbmUgdmFsdWUgaXMgaW5jbHVkZWQgaW4gdGhlIHNjYWxlIGRvbWFpbi4gVGhpcyBvcHRpb24gaXMgaWdub3JlZCBmb3Igbm9uLXF1YW50aXRhdGl2ZSBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXNlUmF3RG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy5cXG5cXG5UaGlzIHByb3BlcnR5IG9ubHkgd29ya3Mgd2l0aCBhZ2dyZWdhdGUgZnVuY3Rpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgd2l0aGluIHRoZSByYXcgZGF0YSBkb21haW4gKGBcXFwibWVhblxcXCJgLCBgXFxcImF2ZXJhZ2VcXFwiYCwgYFxcXCJzdGRldlxcXCJgLCBgXFxcInN0ZGV2cFxcXCJgLCBgXFxcIm1lZGlhblxcXCJgLCBgXFxcInExXFxcImAsIGBcXFwicTNcXFwiYCwgYFxcXCJtaW5cXFwiYCwgYFxcXCJtYXhcXFwiYCkuIEZvciBvdGhlciBhZ2dyZWdhdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyBvdXRzaWRlIG9mIHRoZSByYXcgZGF0YSBkb21haW4gKGUuZy4gYFxcXCJjb3VudFxcXCJgLCBgXFxcInN1bVxcXCJgKSwgdGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlNjYWxlVHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZWFyXCIsXG4gICAgICAgIFwibG9nXCIsXG4gICAgICAgIFwicG93XCIsXG4gICAgICAgIFwic3FydFwiLFxuICAgICAgICBcInF1YW50aWxlXCIsXG4gICAgICAgIFwicXVhbnRpemVcIixcbiAgICAgICAgXCJvcmRpbmFsXCIsXG4gICAgICAgIFwidGltZVwiLFxuICAgICAgICBcInV0Y1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk5pY2VUaW1lXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJzZWNvbmRcIixcbiAgICAgICAgXCJtaW51dGVcIixcbiAgICAgICAgXCJob3VyXCIsXG4gICAgICAgIFwiZGF5XCIsXG4gICAgICAgIFwid2Vla1wiLFxuICAgICAgICBcIm1vbnRoXCIsXG4gICAgICAgIFwieWVhclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNvcnRGaWVsZFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmllbGQgbmFtZSB0byBhZ2dyZWdhdGUgb3Zlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzb3J0IGFnZ3JlZ2F0aW9uIG9wZXJhdG9yXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJvcFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkFnZ3JlZ2F0ZU9wXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ2YWx1ZXNcIixcbiAgICAgICAgXCJjb3VudFwiLFxuICAgICAgICBcInZhbGlkXCIsXG4gICAgICAgIFwibWlzc2luZ1wiLFxuICAgICAgICBcImRpc3RpbmN0XCIsXG4gICAgICAgIFwic3VtXCIsXG4gICAgICAgIFwibWVhblwiLFxuICAgICAgICBcImF2ZXJhZ2VcIixcbiAgICAgICAgXCJ2YXJpYW5jZVwiLFxuICAgICAgICBcInZhcmlhbmNlcFwiLFxuICAgICAgICBcInN0ZGV2XCIsXG4gICAgICAgIFwic3RkZXZwXCIsXG4gICAgICAgIFwibWVkaWFuXCIsXG4gICAgICAgIFwicTFcIixcbiAgICAgICAgXCJxM1wiLFxuICAgICAgICBcIm1vZGVza2V3XCIsXG4gICAgICAgIFwibWluXCIsXG4gICAgICAgIFwibWF4XCIsXG4gICAgICAgIFwiYXJnbWluXCIsXG4gICAgICAgIFwiYXJnbWF4XCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU29ydE9yZGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJhc2NlbmRpbmdcIixcbiAgICAgICAgXCJkZXNjZW5kaW5nXCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlR5cGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInF1YW50aXRhdGl2ZVwiLFxuICAgICAgICBcIm9yZGluYWxcIixcbiAgICAgICAgXCJ0ZW1wb3JhbFwiLFxuICAgICAgICBcIm5vbWluYWxcIixcbiAgICAgICAgXCJnZW9qc29uXCIsXG4gICAgICAgIFwibG9uZ2l0dWRlXCIsXG4gICAgICAgIFwibGF0aXR1ZGVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJUaW1lVW5pdFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwieWVhclwiLFxuICAgICAgICBcIm1vbnRoXCIsXG4gICAgICAgIFwiZGF5XCIsXG4gICAgICAgIFwiZGF0ZVwiLFxuICAgICAgICBcImhvdXJzXCIsXG4gICAgICAgIFwibWludXRlc1wiLFxuICAgICAgICBcInNlY29uZHNcIixcbiAgICAgICAgXCJtaWxsaXNlY29uZHNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXlcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlXCIsXG4gICAgICAgIFwieWVhcmRheVwiLFxuICAgICAgICBcInllYXJkYXRlXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF5aG91cnNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXlob3Vyc21pbnV0ZXNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXlob3Vyc21pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwiaG91cnNtaW51dGVzXCIsXG4gICAgICAgIFwiaG91cnNtaW51dGVzc2Vjb25kc1wiLFxuICAgICAgICBcIm1pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwic2Vjb25kc21pbGxpc2Vjb25kc1wiLFxuICAgICAgICBcInF1YXJ0ZXJcIixcbiAgICAgICAgXCJ5ZWFycXVhcnRlclwiLFxuICAgICAgICBcInF1YXJ0ZXJtb250aFwiLFxuICAgICAgICBcInllYXJxdWFydGVybW9udGhcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJCaW5cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1pblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtaW5pbXVtIGJpbiB2YWx1ZSB0byBjb25zaWRlci4gSWYgdW5zcGVjaWZpZWQsIHRoZSBtaW5pbXVtIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgZmllbGQgaXMgdXNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1heFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXhpbXVtIGJpbiB2YWx1ZSB0byBjb25zaWRlci4gSWYgdW5zcGVjaWZpZWQsIHRoZSBtYXhpbXVtIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgZmllbGQgaXMgdXNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhc2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbnVtYmVyIGJhc2UgdG8gdXNlIGZvciBhdXRvbWF0aWMgYmluIGRldGVybWluYXRpb24gKGRlZmF1bHQgaXMgYmFzZSAxMCkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGVwXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gZXhhY3Qgc3RlcCBzaXplIHRvIHVzZSBiZXR3ZWVuIGJpbnMuIElmIHByb3ZpZGVkLCBvcHRpb25zIHN1Y2ggYXMgbWF4YmlucyB3aWxsIGJlIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGVwc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsbG93YWJsZSBzdGVwIHNpemVzIHRvIGNob29zZSBmcm9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtaW5zdGVwXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBtaW5pbXVtIGFsbG93YWJsZSBzdGVwIHNpemUgKHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIGludGVnZXIgdmFsdWVzKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImRpdlwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjYWxlIGZhY3RvcnMgaW5kaWNhdGluZyBhbGxvd2FibGUgc3ViZGl2aXNpb25zLiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBbNSwgMl0sIHdoaWNoIGluZGljYXRlcyB0aGF0IGZvciBiYXNlIDEwIG51bWJlcnMgKHRoZSBkZWZhdWx0IGJhc2UpLCB0aGUgbWV0aG9kIG1heSBjb25zaWRlciBkaXZpZGluZyBiaW4gc2l6ZXMgYnkgNSBhbmQvb3IgMi4gRm9yIGV4YW1wbGUsIGZvciBhbiBpbml0aWFsIHN0ZXAgc2l6ZSBvZiAxMCwgdGhlIG1ldGhvZCBjYW4gY2hlY2sgaWYgYmluIHNpemVzIG9mIDIgKD0gMTAvNSksIDUgKD0gMTAvMiksIG9yIDEgKD0gMTAvKDUqMikpIG1pZ2h0IGFsc28gc2F0aXNmeSB0aGUgZ2l2ZW4gY29uc3RyYWludHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1heGJpbnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXhpbXVtIG51bWJlciBvZiBiaW5zLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAyLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQ2hhbm5lbERlZldpdGhMZWdlbmRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxlZ2VuZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MZWdlbmRcIlxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0RmllbGRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGVnZW5kXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIGxlZ2VuZCBsYWJlbHMuIFZlZ2EgdXNlcyBEM1xcXFwncyBmb3JtYXQgcGF0dGVybi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBmb3IgdGhlIGxlZ2VuZC4gKFNob3dzIGZpZWxkIG5hbWUgYW5kIGl0cyBmdW5jdGlvbiBieSBkZWZhdWx0LilcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkV4cGxpY2l0bHkgc2V0IHRoZSB2aXNpYmxlIGxlZ2VuZCB2YWx1ZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsZWdlbmQuIE9uZSBvZiBcXFwibGVmdFxcXCIgb3IgXFxcInJpZ2h0XFxcIi4gVGhpcyBkZXRlcm1pbmVzIGhvdyB0aGUgbGVnZW5kIGlzIHBvc2l0aW9uZWQgd2l0aGluIHRoZSBzY2VuZS4gVGhlIGRlZmF1bHQgaXMgXFxcInJpZ2h0XFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGxlZ2VuZCBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgbGVuZ2VuZCBhbmQgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmdpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJnaW4gYXJvdW5kIHRoZSBsZWdlbmQsIGluIHBpeGVsc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudEhlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBoZWlnaHQgb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBhbGlnbm1lbnQgb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGxlZnQsIG1pZGRsZSBvciByaWdodC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcG9zaXRpb24gb2YgdGhlIGJhc2VsaW5lIG9mIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIHRvcCwgbWlkZGxlIG9yIGJvdHRvbS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZW5nZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGVuZ2VuZCBsYWJsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCBvZiB0aGUgbGVnZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBzeW1ib2wsXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaGFwZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaGFwZSBvZiB0aGUgbGVnZW5kIHN5bWJvbCwgY2FuIGJlIHRoZSAnY2lyY2xlJywgJ3NxdWFyZScsICdjcm9zcycsICdkaWFtb25kJyxcXG5cXG4ndHJpYW5nbGUtdXAnLCAndHJpYW5nbGUtZG93bicuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGxlbmdlbmQgc3ltYm9sLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgc3ltYm9sJ3Mgc3Ryb2tlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cXG5cXG5UaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmllbGREZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJPcmRlckNoYW5uZWxEZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFGb3JtYXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIHRoZSBmb3JtYXQgZm9yIHRoZSBkYXRhIGZpbGUgb3IgdmFsdWVzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXJsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBVUkwgZnJvbSB3aGljaCB0byBsb2FkIHRoZSBkYXRhIHNldC4gVXNlIHRoZSBmb3JtYXRUeXBlIHByb3BlcnR5XFxuXFxudG8gZW5zdXJlIHRoZSBsb2FkZWQgZGF0YSBpcyBjb3JyZWN0bHkgcGFyc2VkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGFzcyBhcnJheSBvZiBvYmplY3RzIGluc3RlYWQgb2YgYSB1cmwgdG8gYSBmaWxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7fVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkRhdGFGb3JtYXRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YUZvcm1hdFR5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHlwZSBvZiBpbnB1dCBkYXRhOiBgXFxcImpzb25cXFwiYCwgYFxcXCJjc3ZcXFwiYCwgYFxcXCJ0c3ZcXFwiYC5cXG5cXG5UaGUgZGVmYXVsdCBmb3JtYXQgdHlwZSBpcyBkZXRlcm1pbmVkIGJ5IHRoZSBleHRlbnNpb24gb2YgdGhlIGZpbGUgdXJsLlxcblxcbklmIG5vIGV4dGVuc2lvbiBpcyBkZXRlY3RlZCwgYFxcXCJqc29uXFxcImAgd2lsbCBiZSB1c2VkIGJ5IGRlZmF1bHQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkpTT04gb25seSkgVGhlIEpTT04gcHJvcGVydHkgY29udGFpbmluZyB0aGUgZGVzaXJlZCBkYXRhLlxcblxcblRoaXMgcGFyYW1ldGVyIGNhbiBiZSB1c2VkIHdoZW4gdGhlIGxvYWRlZCBKU09OIGZpbGUgbWF5IGhhdmUgc3Vycm91bmRpbmcgc3RydWN0dXJlIG9yIG1ldGEtZGF0YS5cXG5cXG5Gb3IgZXhhbXBsZSBgXFxcInByb3BlcnR5XFxcIjogXFxcInZhbHVlcy5mZWF0dXJlc1xcXCJgIGlzIGVxdWl2YWxlbnQgdG8gcmV0cmlldmluZyBganNvbi52YWx1ZXMuZmVhdHVyZXNgXFxuXFxuZnJvbSB0aGUgbG9hZGVkIEpTT04gb2JqZWN0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmVhdHVyZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBuYW1lIG9mIHRoZSBUb3BvSlNPTiBvYmplY3Qgc2V0IHRvIGNvbnZlcnQgdG8gYSBHZW9KU09OIGZlYXR1cmUgY29sbGVjdGlvbi5cXG5cXG5Gb3IgZXhhbXBsZSwgaW4gYSBtYXAgb2YgdGhlIHdvcmxkLCB0aGVyZSBtYXkgYmUgYW4gb2JqZWN0IHNldCBuYW1lZCBgXFxcImNvdW50cmllc1xcXCJgLlxcblxcblVzaW5nIHRoZSBmZWF0dXJlIHByb3BlcnR5LCB3ZSBjYW4gZXh0cmFjdCB0aGlzIHNldCBhbmQgZ2VuZXJhdGUgYSBHZW9KU09OIGZlYXR1cmUgb2JqZWN0IGZvciBlYWNoIGNvdW50cnkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG5hbWUgb2YgdGhlIFRvcG9KU09OIG9iamVjdCBzZXQgdG8gY29udmVydCB0byBhIG1lc2guXFxuXFxuU2ltaWxhciB0byB0aGUgYGZlYXR1cmVgIG9wdGlvbiwgYG1lc2hgIGV4dHJhY3RzIGEgbmFtZWQgVG9wb0pTT04gb2JqZWN0IHNldC5cXG5cXG5Vbmxpa2UgdGhlIGBmZWF0dXJlYCBvcHRpb24sIHRoZSBjb3JyZXNwb25kaW5nIGdlbyBkYXRhIGlzIHJldHVybmVkIGFzIGEgc2luZ2xlLCB1bmlmaWVkIG1lc2ggaW5zdGFuY2UsIG5vdCBhcyBpbmlkaXZpZHVhbCBHZW9KU09OIGZlYXR1cmVzLlxcblxcbkV4dHJhY3RpbmcgYSBtZXNoIGlzIHVzZWZ1bCBmb3IgbW9yZSBlZmZpY2llbnRseSBkcmF3aW5nIGJvcmRlcnMgb3Igb3RoZXIgZ2VvZ3JhcGhpYyBlbGVtZW50cyB0aGF0IHlvdSBkbyBub3QgbmVlZCB0byBhc3NvY2lhdGUgd2l0aCBzcGVjaWZpYyByZWdpb25zIHN1Y2ggYXMgaW5kaXZpZHVhbCBjb3VudHJpZXMsIHN0YXRlcyBvciBjb3VudGllcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkRhdGFGb3JtYXRUeXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJqc29uXCIsXG4gICAgICAgIFwiY3N2XCIsXG4gICAgICAgIFwidHN2XCIsXG4gICAgICAgIFwidG9wb2pzb25cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJUcmFuc2Zvcm1cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpbHRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIGZpbHRlciBWZWdhIGV4cHJlc3Npb24uIFVzZSBgZGF0dW1gIHRvIHJlZmVyIHRvIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsdGVyTnVsbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZpbHRlciBudWxsIHZhbHVlcyBmcm9tIHRoZSBkYXRhLiBJZiBzZXQgdG8gdHJ1ZSwgYWxsIHJvd3Mgd2l0aCBudWxsIHZhbHVlcyBhcmUgZmlsdGVyZWQuIElmIGZhbHNlLCBubyByb3dzIGFyZSBmaWx0ZXJlZC4gU2V0IHRoZSBwcm9wZXJ0eSB0byB1bmRlZmluZWQgdG8gZmlsdGVyIG9ubHkgcXVhbnRpdGF0aXZlIGFuZCB0ZW1wb3JhbCBmaWVsZHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2FsY3VsYXRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2FsY3VsYXRlIG5ldyBmaWVsZChzKSB1c2luZyB0aGUgcHJvdmlkZWQgZXhwcmVzc3Npb24ocykuIENhbGN1bGF0aW9uIGFyZSBhcHBsaWVkIGJlZm9yZSBmaWx0ZXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9ybXVsYVwiLFxuICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvcm11bGEgb2JqZWN0IGZvciBjYWxjdWxhdGUuXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRm9ybXVsYVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmllbGQgaW4gd2hpY2ggdG8gc3RvcmUgdGhlIGNvbXB1dGVkIGZvcm11bGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJleHByXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgY29udGFpbmluZyBhbiBleHByZXNzaW9uIGZvciB0aGUgZm9ybXVsYS4gVXNlIHRoZSB2YXJpYWJsZSBgZGF0dW1gIHRvIHRvIHJlZmVyIHRvIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcImV4cHJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJQcm9qZWN0aW9uXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNlbnRlclwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zbGF0ZVwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInJvdGF0ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBvZiB0aGUgcHJvamVjdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInByZWNpc2lvblwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjbGlwQW5nbGVcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ2aWV3cG9ydFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBvbi1zY3JlZW4gdmlld3BvcnQsIGluIHBpeGVscy4gSWYgbmVjZXNzYXJ5LCBjbGlwcGluZyBhbmQgc2Nyb2xsaW5nIHdpbGwgYmUgYXBwbGllZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhY2tncm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDU1MgY29sb3IgcHJvcGVydHkgdG8gdXNlIGFzIGJhY2tncm91bmQgb2YgdmlzdWFsaXphdGlvbi4gRGVmYXVsdCBpcyBgXFxcInRyYW5zcGFyZW50XFxcImAuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJudW1iZXJGb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEMyBOdW1iZXIgZm9ybWF0IGZvciBheGlzIGxhYmVscyBhbmQgdGV4dCB0YWJsZXMuIEZvciBleGFtcGxlIFxcXCJzXFxcIiBmb3IgU0kgdW5pdHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lRm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBkYXRldGltZSBmb3JtYXQgZm9yIGF4aXMgYW5kIGxlZ2VuZCBsYWJlbHMuIFRoZSBmb3JtYXQgY2FuIGJlIHNldCBkaXJlY3RseSBvbiBlYWNoIGF4aXMgYW5kIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNlbGxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2VsbENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDZWxsIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFya1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1hcmsgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvdmVybGF5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL092ZXJsYXlDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWFyayBPdmVybGF5IENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NhbGUgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXhpcyBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxlZ2VuZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MZWdlbmRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTGVnZW5kIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvamVjdGlvblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qcm9qZWN0aW9uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmYWNldFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBDb25maWdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkNlbGxDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIndpZHRoXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImhlaWdodFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjbGlwXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZpbGwgY29sb3IuXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlsbCBvcGFjaXR5ICh2YWx1ZSBiZXR3ZWVuIFswLDFdKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2UgY29sb3IuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBvcGFjaXR5ICh2YWx1ZSBiZXR3ZWVuIFswLDFdKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSB3aWR0aCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsdGVybmF0aW5nIHN0cm9rZSwgc3BhY2UgbGVuZ3RocyBmb3IgY3JlYXRpbmcgZGFzaGVkIG9yIGRvdHRlZCBsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaE9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIHN0cm9rZSBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTWFya0NvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmlsbGVkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciB0aGUgc2hhcGVcXFxcJ3MgY29sb3Igc2hvdWxkIGJlIHVzZWQgYXMgZmlsbCBjb2xvciBpbnN0ZWFkIG9mIHN0cm9rZSBjb2xvci5cXG5cXG5UaGlzIGlzIG9ubHkgYXBwbGljYWJsZSBmb3IgXFxcImJhclxcXCIsIFxcXCJwb2ludFxcXCIsIGFuZCBcXFwiYXJlYVxcXCIuXFxuXFxuQWxsIG1hcmtzIGV4Y2VwdCBcXFwicG9pbnRcXFwiIG1hcmtzIGFyZSBmaWxsZWQgYnkgZGVmYXVsdC5cXG5cXG5TZWUgTWFyayBEb2N1bWVudGF0aW9uIChodHRwOi8vdmVnYS5naXRodWIuaW8vdmVnYS1saXRlL2RvY3MvbWFya3MuaHRtbClcXG5cXG5mb3IgdXNhZ2UgZXhhbXBsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgY29sb3IuXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgRmlsbCBDb2xvci4gIFRoaXMgaGFzIGhpZ2hlciBwcmVjZWRlbmNlIHRoYW4gY29uZmlnLmNvbG9yXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBTdHJva2UgQ29sb3IuICBUaGlzIGhhcyBoaWdoZXIgcHJlY2VkZW5jZSB0aGFuIGNvbmZpZy5jb2xvclwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwibWF4aW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwibWF4aW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJtYXhpbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gYXJyYXkgb2YgYWx0ZXJuYXRpbmcgc3Ryb2tlLCBzcGFjZSBsZW5ndGhzIGZvciBjcmVhdGluZyBkYXNoZWQgb3IgZG90dGVkIGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgc3Ryb2tlIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGFja2VkXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1N0YWNrT2Zmc2V0XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgYSBub24tc3RhY2tlZCBiYXIsIHRpY2ssIGFyZWEsIGFuZCBsaW5lIGNoYXJ0cy5cXG5cXG5UaGUgdmFsdWUgaXMgZWl0aGVyIGhvcml6b250YWwgKGRlZmF1bHQpIG9yIHZlcnRpY2FsLlxcblxcbi0gRm9yIGJhciwgcnVsZSBhbmQgdGljaywgdGhpcyBkZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNpemUgb2YgdGhlIGJhciBhbmQgdGlja1xcblxcbnNob3VsZCBiZSBhcHBsaWVkIHRvIHggb3IgeSBkaW1lbnNpb24uXFxuXFxuLSBGb3IgYXJlYSwgdGhpcyBwcm9wZXJ0eSBkZXRlcm1pbmVzIHRoZSBvcmllbnQgcHJvcGVydHkgb2YgdGhlIFZlZ2Egb3V0cHV0Llxcblxcbi0gRm9yIGxpbmUsIHRoaXMgcHJvcGVydHkgZGV0ZXJtaW5lcyB0aGUgc29ydCBvcmRlciBvZiB0aGUgcG9pbnRzIGluIHRoZSBsaW5lXFxuXFxuaWYgYGNvbmZpZy5zb3J0TGluZUJ5YCBpcyBub3Qgc3BlY2lmaWVkLlxcblxcbkZvciBzdGFja2VkIGNoYXJ0cywgdGhpcyBpcyBhbHdheXMgZGV0ZXJtaW5lZCBieSB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHN0YWNrO1xcblxcbnRoZXJlZm9yZSBleHBsaWNpdGx5IHNwZWNpZmllZCB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJpbnRlcnBvbGF0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9JbnRlcnBvbGF0ZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGluZSBpbnRlcnBvbGF0aW9uIG1ldGhvZCB0byB1c2UuIE9uZSBvZiBsaW5lYXIsIHN0ZXAtYmVmb3JlLCBzdGVwLWFmdGVyLCBiYXNpcywgYmFzaXMtb3BlbiwgY2FyZGluYWwsIGNhcmRpbmFsLW9wZW4sIG1vbm90b25lLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGVuc2lvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlcGVuZGluZyBvbiB0aGUgaW50ZXJwb2xhdGlvbiB0eXBlLCBzZXRzIHRoZSB0ZW5zaW9uIHBhcmFtZXRlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxpbmVTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiBsaW5lIG1hcmsuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJydWxlU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgcnVsZSBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBiYXJzLiAgSWYgdW5zcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHNpemUgaXMgIGBiYW5kU2l6ZS0xYCxcXG5cXG53aGljaCBwcm92aWRlcyAxIHBpeGVsIG9mZnNldCBiZXR3ZWVuIGJhcnMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJUaGluU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBiYXJzIG9uIGNvbnRpbnVvdXMgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2hhcGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN5bWJvbCBzaGFwZSB0byB1c2UuIE9uZSBvZiBjaXJjbGUgKGRlZmF1bHQpLCBzcXVhcmUsIGNyb3NzLCBkaWFtb25kLCB0cmlhbmdsZS11cCwgb3IgdHJpYW5nbGUtZG93bi5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGl4ZWwgYXJlYSBlYWNoIHRoZSBwb2ludC4gRm9yIGV4YW1wbGU6IGluIHRoZSBjYXNlIG9mIGNpcmNsZXMsIHRoZSByYWRpdXMgaXMgZGV0ZXJtaW5lZCBpbiBwYXJ0IGJ5IHRoZSBzcXVhcmUgcm9vdCBvZiB0aGUgc2l6ZSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSB0aWNrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tUaGlja25lc3NcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGlja25lc3Mgb2YgdGhlIHRpY2sgbWFyay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImFsaWduXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0hvcml6b250YWxBbGlnblwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgaG9yaXpvbnRhbCBhbGlnbm1lbnQgb2YgdGhlIHRleHQuIE9uZSBvZiBsZWZ0LCByaWdodCwgY2VudGVyLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYW5nbGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcm90YXRpb24gYW5nbGUgb2YgdGhlIHRleHQsIGluIGRlZ3JlZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9WZXJ0aWNhbEFsaWduXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB2ZXJ0aWNhbCBhbGlnbm1lbnQgb2YgdGhlIHRleHQuIE9uZSBvZiB0b3AsIG1pZGRsZSwgYm90dG9tLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZHhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgaG9yaXpvbnRhbCBvZmZzZXQsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgdGV4dCBsYWJlbCBhbmQgaXRzIGFuY2hvciBwb2ludC4gVGhlIG9mZnNldCBpcyBhcHBsaWVkIGFmdGVyIHJvdGF0aW9uIGJ5IHRoZSBhbmdsZSBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHZlcnRpY2FsIG9mZnNldCwgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSB0ZXh0IGxhYmVsIGFuZCBpdHMgYW5jaG9yIHBvaW50LiBUaGUgb2Zmc2V0IGlzIGFwcGxpZWQgYWZ0ZXIgcm90YXRpb24gYnkgdGhlIGFuZ2xlIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicmFkaXVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUG9sYXIgY29vcmRpbmF0ZSByYWRpYWwgb2Zmc2V0LCBpbiBwaXhlbHMsIG9mIHRoZSB0ZXh0IGxhYmVsIGZyb20gdGhlIG9yaWdpbiBkZXRlcm1pbmVkIGJ5IHRoZSB4IGFuZCB5IHByb3BlcnRpZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aGV0YVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBvbGFyIGNvb3JkaW5hdGUgYW5nbGUsIGluIHJhZGlhbnMsIG9mIHRoZSB0ZXh0IGxhYmVsIGZyb20gdGhlIG9yaWdpbiBkZXRlcm1pbmVkIGJ5IHRoZSB4IGFuZCB5IHByb3BlcnRpZXMuIFZhbHVlcyBmb3IgdGhldGEgZm9sbG93IHRoZSBzYW1lIGNvbnZlbnRpb24gb2YgYXJjIG1hcmsgc3RhcnRBbmdsZSBhbmQgZW5kQW5nbGUgcHJvcGVydGllczogYW5nbGVzIGFyZSBtZWFzdXJlZCBpbiByYWRpYW5zLCB3aXRoIDAgaW5kaWNhdGluZyBcXFwibm9ydGhcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB0eXBlZmFjZSB0byBzZXQgdGhlIHRleHQgaW4gKGUuZy4sIEhlbHZldGljYSBOZXVlKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFN0eWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZvbnRTdHlsZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzdHlsZSAoZS5nLiwgaXRhbGljKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9udFdlaWdodFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCB3ZWlnaHQgKGUuZy4sIGJvbGQpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgdGV4dCB2YWx1ZS4gSWYgbm90IGRlZmluZWQsIHRoaXMgd2lsbCBiZSBkZXRlcm1pbmVkIGF1dG9tYXRpY2FsbHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGxhY2Vob2xkZXIgVGV4dFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXBwbHlDb2xvclRvQmFja2dyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFwcGx5IGNvbG9yIGZpZWxkIHRvIGJhY2tncm91bmQgY29sb3IgaW5zdGVhZCBvZiB0aGUgdGV4dC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJTdGFja09mZnNldFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiemVyb1wiLFxuICAgICAgICBcImNlbnRlclwiLFxuICAgICAgICBcIm5vcm1hbGl6ZVwiLFxuICAgICAgICBcIm5vbmVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJJbnRlcnBvbGF0ZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZWFyXCIsXG4gICAgICAgIFwibGluZWFyLWNsb3NlZFwiLFxuICAgICAgICBcInN0ZXBcIixcbiAgICAgICAgXCJzdGVwLWJlZm9yZVwiLFxuICAgICAgICBcInN0ZXAtYWZ0ZXJcIixcbiAgICAgICAgXCJiYXNpc1wiLFxuICAgICAgICBcImJhc2lzLW9wZW5cIixcbiAgICAgICAgXCJiYXNpcy1jbG9zZWRcIixcbiAgICAgICAgXCJjYXJkaW5hbFwiLFxuICAgICAgICBcImNhcmRpbmFsLW9wZW5cIixcbiAgICAgICAgXCJjYXJkaW5hbC1jbG9zZWRcIixcbiAgICAgICAgXCJidW5kbGVcIixcbiAgICAgICAgXCJtb25vdG9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNoYXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJjaXJjbGVcIixcbiAgICAgICAgXCJzcXVhcmVcIixcbiAgICAgICAgXCJjcm9zc1wiLFxuICAgICAgICBcImRpYW1vbmRcIixcbiAgICAgICAgXCJ0cmlhbmdsZS11cFwiLFxuICAgICAgICBcInRyaWFuZ2xlLWRvd25cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJIb3Jpem9udGFsQWxpZ25cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxlZnRcIixcbiAgICAgICAgXCJyaWdodFwiLFxuICAgICAgICBcImNlbnRlclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlZlcnRpY2FsQWxpZ25cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInRvcFwiLFxuICAgICAgICBcIm1pZGRsZVwiLFxuICAgICAgICBcImJvdHRvbVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZvbnRTdHlsZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibm9ybWFsXCIsXG4gICAgICAgIFwiaXRhbGljXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRm9udFdlaWdodFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibm9ybWFsXCIsXG4gICAgICAgIFwiYm9sZFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk92ZXJsYXlDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIHRvIG92ZXJsYXkgbGluZSB3aXRoIHBvaW50LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImFyZWFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXJlYU92ZXJsYXlcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHlwZSBvZiBvdmVybGF5IGZvciBhcmVhIG1hcmsgKGxpbmUgb3IgbGluZXBvaW50KVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicG9pbnRTdHlsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgc3R5bGUgZm9yIHRoZSBvdmVybGF5ZWQgcG9pbnQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsaW5lU3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHN0eWxlIGZvciB0aGUgb3ZlcmxheWVkIHBvaW50LlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXJlYU92ZXJsYXlcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxpbmVcIixcbiAgICAgICAgXCJsaW5lcG9pbnRcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU2NhbGVDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgcm91bmRzIG51bWVyaWMgb3V0cHV0IHZhbHVlcyB0byBpbnRlZ2Vycy5cXG5cXG5UaGlzIGNhbiBiZSBoZWxwZnVsIGZvciBzbmFwcGluZyB0byB0aGUgcGl4ZWwgZ3JpZC5cXG5cXG4oT25seSBhdmFpbGFibGUgZm9yIGB4YCwgYHlgLCBgc2l6ZWAsIGByb3dgLCBhbmQgYGNvbHVtbmAgc2NhbGVzLilcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0QmFuZFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBiYW5kIHdpZHRoIGZvciBgeGAgb3JkaW5hbCBzY2FsZSB3aGVuIGlzIG1hcmsgaXMgYHRleHRgLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFuZFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGJhbmQgc2l6ZSBmb3IgKDEpIGB5YCBvcmRpbmFsIHNjYWxlLFxcblxcbmFuZCAoMikgYHhgIG9yZGluYWwgc2NhbGUgd2hlbiB0aGUgbWFyayBpcyBub3QgYHRleHRgLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG9wYWNpdHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHBhZGRpbmcgZm9yIGB4YCBhbmQgYHlgIG9yZGluYWwgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXNlUmF3RG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy5cXG5cXG5UaGlzIHByb3BlcnR5IG9ubHkgd29ya3Mgd2l0aCBhZ2dyZWdhdGUgZnVuY3Rpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgd2l0aGluIHRoZSByYXcgZGF0YSBkb21haW4gKGBcXFwibWVhblxcXCJgLCBgXFxcImF2ZXJhZ2VcXFwiYCwgYFxcXCJzdGRldlxcXCJgLCBgXFxcInN0ZGV2cFxcXCJgLCBgXFxcIm1lZGlhblxcXCJgLCBgXFxcInExXFxcImAsIGBcXFwicTNcXFwiYCwgYFxcXCJtaW5cXFwiYCwgYFxcXCJtYXhcXFwiYCkuIEZvciBvdGhlciBhZ2dyZWdhdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyBvdXRzaWRlIG9mIHRoZSByYXcgZGF0YSBkb21haW4gKGUuZy4gYFxcXCJjb3VudFxcXCJgLCBgXFxcInN1bVxcXCJgKSwgdGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5vbWluYWxDb2xvclJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igbm9taW5hbCBjb2xvciBzY2FsZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXF1ZW50aWFsQ29sb3JSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG9yZGluYWwgLyBjb250aW51b3VzIGNvbG9yIHNjYWxlXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBzaGFwZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBiYXIgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgZm9udCBzaXplIHNjYWxlXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInJ1bGVTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBydWxlIHN0cm9rZSB3aWR0aHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIHRpY2sgc3BhbnNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicG9pbnRTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBiYXIgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJheGlzV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaWR0aCBvZiB0aGUgYXhpcyBsaW5lXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYXllclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGluZGljYXRpbmcgaWYgdGhlIGF4aXMgKGFuZCBhbnkgZ3JpZGxpbmVzKSBzaG91bGQgYmUgcGxhY2VkIGFib3ZlIG9yIGJlbG93IHRoZSBkYXRhIG1hcmtzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgYXhpcyBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBheGlzIGxpbmUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBmbGFnIGluZGljYXRlIGlmIGdyaWRsaW5lcyBzaG91bGQgYmUgY3JlYXRlZCBpbiBhZGRpdGlvbiB0byB0aWNrcy4gSWYgYGdyaWRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIFJPVyBhbmQgQ09MLiBGb3IgWCBhbmQgWSwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBxdWFudGl0YXRpdmUgYW5kIHRpbWUgZmllbGRzIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBncmlkbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIGdyaWQgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgb2YgZ3JpZCAodmFsdWUgYmV0d2VlbiBbMCwxXSlcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBncmlkIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJFbmFibGUgb3IgZGlzYWJsZSBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBhbGlnbm1lbnQgZm9yIHRoZSBMYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGJhc2VsaW5lIGZvciB0aGUgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRydW5jYXRlIGxhYmVscyB0aGF0IGFyZSB0b28gbG9uZy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggYW5kIGRheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ViZGl2aWRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgcHJvdmlkZWQsIHNldHMgdGhlIG51bWJlciBvZiBtaW5vciB0aWNrcyBiZXR3ZWVuIG1ham9yIHRpY2tzICh0aGUgdmFsdWUgOSByZXN1bHRzIGluIGRlY2ltYWwgc3ViZGl2aXNpb24pLiBPbmx5IGFwcGxpY2FibGUgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBkZXNpcmVkIG51bWJlciBvZiB0aWNrcywgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy4gVGhlIHJlc3VsdGluZyBudW1iZXIgbWF5IGJlIGRpZmZlcmVudCBzbyB0aGF0IHZhbHVlcyBhcmUgXFxcIm5pY2VcXFwiIChtdWx0aXBsZXMgb2YgMiwgNSwgMTApIGFuZCBsaWUgd2l0aGluIHRoZSB1bmRlcmx5aW5nIHNjYWxlJ3MgcmFuZ2UuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGF4aXMncyB0aWNrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIHRpY2sgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIHRpY2sgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGFiZWwsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tQYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aWNrcyBhbmQgdGV4dCBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yLCBtaW5vciBhbmQgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNYWpvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNaW5vclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1pbm9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVFbmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGgsIGluIHBpeGVscywgb2YgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRm9udCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXZWlnaHQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIG9mZnNldCB2YWx1ZSBmb3IgdGhlIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heCBsZW5ndGggZm9yIGF4aXMgdGl0bGUgaWYgdGhlIHRpdGxlIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGZyb20gdGhlIGZpZWxkJ3MgZGVzY3JpcHRpb24uIEJ5IGRlZmF1bHQsIHRoaXMgaXMgYXV0b21hdGljYWxseSBiYXNlZCBvbiBjZWxsIHNpemUgYW5kIGNoYXJhY3RlcldpZHRoIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2hhcmFjdGVyV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDaGFyYWN0ZXIgd2lkdGggZm9yIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5pbmcgdGl0bGUgbWF4IGxlbmd0aC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gYXhpcyBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGVnZW5kQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGxlZ2VuZC4gT25lIG9mIFxcXCJsZWZ0XFxcIiBvciBcXFwicmlnaHRcXFwiLiBUaGlzIGRldGVybWluZXMgaG93IHRoZSBsZWdlbmQgaXMgcG9zaXRpb25lZCB3aXRoaW4gdGhlIHNjZW5lLiBUaGUgZGVmYXVsdCBpcyBcXFwicmlnaHRcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgbGVnZW5kIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSBsZW5nZW5kIGFuZCBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFyZ2luXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmdpbiBhcm91bmQgdGhlIGxlZ2VuZCwgaW4gcGl4ZWxzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50SGVpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhlaWdodCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50V2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGFsaWdubWVudCBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgbGVmdCwgbWlkZGxlIG9yIHJpZ2h0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwb3NpdGlvbiBvZiB0aGUgYmFzZWxpbmUgb2YgbGVnZW5kIGxhYmVsLCBjYW4gYmUgdG9wLCBtaWRkbGUgb3IgYm90dG9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlbmdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsZW5nZW5kIGxhYmxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IG9mIHRoZSBsZWdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHN5bWJvbCxcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNoYXBlIG9mIHRoZSBsZWdlbmQgc3ltYm9sLCBjYW4gYmUgdGhlICdjaXJjbGUnLCAnc3F1YXJlJywgJ2Nyb3NzJywgJ2RpYW1vbmQnLFxcblxcbid0cmlhbmdsZS11cCcsICd0cmlhbmdsZS1kb3duJy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgbGVuZ2VuZCBzeW1ib2wsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBzeW1ib2wncyBzdHJva2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlxcblxcblRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCB3ZWlnaHQgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRTY2FsZUNvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBTY2FsZSBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBBeGlzIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldEdyaWRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgR3JpZCBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNlbGxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2VsbENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBDZWxsIENvbmZpZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRTY2FsZUNvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm91bmRcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRHcmlkQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmYWNldFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3BlY1wiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTGF5ZXJTcGVjXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVW5pdFNwZWNcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcInByb2plY3Rpb25cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUHJvamVjdGlvblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmYWNldFwiLFxuICAgICAgICBcInNwZWNcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGYWNldFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm93XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sdW1uXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGF5ZXJTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsYXllcnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJVbml0IHNwZWNzIHRoYXQgd2lsbCBiZSBsYXllcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRTcGVjXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9qZWN0aW9uXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Byb2plY3Rpb25cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibGF5ZXJzXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVW5pdFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyayB0eXBlLlxcblxcbk9uZSBvZiBgXFxcImJhclxcXCJgLCBgXFxcImNpcmNsZVxcXCJgLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcInRpY2tcXFwiYCwgYFxcXCJsaW5lXFxcImAsXFxuXFxuYFxcXCJhcmVhXFxcImAsIGBcXFwicG9pbnRcXFwiYCwgYFxcXCJydWxlXFxcImAsIGFuZCBgXFxcInRleHRcXFwiYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImVuY29kaW5nXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRFbmNvZGluZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGtleS12YWx1ZSBtYXBwaW5nIGJldHdlZW4gZW5jb2RpbmcgY2hhbm5lbHMgYW5kIGRlZmluaXRpb24gb2YgZmllbGRzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9qZWN0aW9uXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Byb2plY3Rpb25cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibWFya1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlVuaXRFbmNvZGluZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwieFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWCBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcIngyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieTJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBmaWxsIG9yIHN0cm9rZSBjb2xvciBiYXNlZCBvbiBtYXJrIHR5cGUuXFxuXFxuKEJ5IGRlZmF1bHQsIGZpbGwgY29sb3IgZm9yIGBhcmVhYCwgYGJhcmAsIGB0aWNrYCwgYHRleHRgLCBgY2lyY2xlYCwgYW5kIGBzcXVhcmVgIC9cXG5cXG5zdHJva2UgY29sb3IgZm9yIGBsaW5lYCBhbmQgYHBvaW50YC4pXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wYWNpdHkgb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgY2FuIGJlIGEgdmFsdWUgb3IgaW4gYSByYW5nZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNpemVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgcG9pbnRgLCBgc3F1YXJlYCBhbmQgYGNpcmNsZWBcXG5cXG7igJMgdGhlIHN5bWJvbCBzaXplLCBvciBwaXhlbCBhcmVhIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBiYXJgIGFuZCBgdGlja2Ag4oCTIHRoZSBiYXIgYW5kIHRpY2sncyBzaXplLlxcblxcbi0gRm9yIGB0ZXh0YCDigJMgdGhlIHRleHQncyBmb250IHNpemUuXFxuXFxuLSBTaXplIGlzIGN1cnJlbnRseSB1bnN1cHBvcnRlZCBmb3IgYGxpbmVgIGFuZCBgYXJlYWAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3ltYm9sJ3Mgc2hhcGUgKG9ubHkgZm9yIGBwb2ludGAgbWFya3MpLiBUaGUgc3VwcG9ydGVkIHZhbHVlcyBhcmVcXG5cXG5gXFxcImNpcmNsZVxcXCJgIChkZWZhdWx0KSwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJjcm9zc1xcXCJgLCBgXFxcImRpYW1vbmRcXFwiYCwgYFxcXCJ0cmlhbmdsZS11cFxcXCJgLFxcblxcbm9yIGBcXFwidHJpYW5nbGUtZG93blxcXCJgLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV0YWlsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWRkaXRpb25hbCBsZXZlbHMgb2YgZGV0YWlsIGZvciBncm91cGluZyBkYXRhIGluIGFnZ3JlZ2F0ZSB2aWV3cyBhbmRcXG5cXG5pbiBsaW5lIGFuZCBhcmVhIG1hcmtzIHdpdGhvdXQgbWFwcGluZyBkYXRhIHRvIGEgc3BlY2lmaWMgdmlzdWFsIGNoYW5uZWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgb2YgdGhlIGB0ZXh0YCBtYXJrLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcImdlb3BhdGhcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcmRlciBvZiBkYXRhIHBvaW50cyBpbiBsaW5lIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JkZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJMYXllciBvcmRlciBmb3Igbm9uLXN0YWNrZWQgbWFya3MsIG9yIHN0YWNrIG9yZGVyIGZvciBzdGFja2VkIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiJHNjaGVtYVwiOiBcImh0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDQvc2NoZW1hI1wiXG59OyIsIid1c2Ugc3RyaWN0Jztcbi8qIGdsb2JhbHMgd2luZG93LCBhbmd1bGFyICovXG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJywgW1xuICAgICdMb2NhbFN0b3JhZ2VNb2R1bGUnLFxuICAgICdhbmd1bGFyLWdvb2dsZS1hbmFseXRpY3MnXG4gIF0pXG4gIC5jb25zdGFudCgnXycsIHdpbmRvdy5fKVxuICAvLyBkYXRhbGliLCB2ZWdhbGl0ZSwgdmVnYVxuICAuY29uc3RhbnQoJ3ZsJywgd2luZG93LnZsKVxuICAuY29uc3RhbnQoJ3ZsU2NoZW1hJywgd2luZG93LnZsU2NoZW1hKVxuICAuY29uc3RhbnQoJ3ZnJywgd2luZG93LnZnKVxuICAvLyBvdGhlciBsaWJyYXJpZXNcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBVc2UgdGhlIGN1c3RvbWl6ZWQgdmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnlcbiAgLmNvbnN0YW50KCdKU09OMycsIHdpbmRvdy5KU09OMy5ub0NvbmZsaWN0KCkpXG4gIC8vIGNvbnN0YW50c1xuICAuY29uc3RhbnQoJ2NvbnN0cycsIHtcbiAgICBhZGRDb3VudDogdHJ1ZSwgLy8gYWRkIGNvdW50IGZpZWxkIHRvIERhdGFzZXQuZGF0YXNjaGVtYVxuICAgIGRlYnVnOiB0cnVlLFxuICAgIHVzZVVybDogdHJ1ZSxcbiAgICBsb2dnaW5nOiB0cnVlLFxuICAgIGRlZmF1bHRDb25maWdTZXQ6ICdsYXJnZScsXG4gICAgYXBwSWQ6ICd2bHVpJyxcbiAgICAvLyBlbWJlZGRlZCBwb2xlc3RhciBhbmQgdm95YWdlciB3aXRoIGtub3duIGRhdGFcbiAgICBlbWJlZGRlZERhdGE6IHdpbmRvdy52Z3VpRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgcHJpb3JpdHk6IHtcbiAgICAgIGJvb2ttYXJrOiAwLFxuICAgICAgcG9wdXA6IDAsXG4gICAgICB2aXNsaXN0OiAxMDAwXG4gICAgfSxcbiAgICBteXJpYVJlc3Q6ICdodHRwOi8vZWMyLTUyLTEtMzgtMTgyLmNvbXB1dGUtMS5hbWF6b25hd3MuY29tOjg3NTMnLFxuICAgIGRlZmF1bHRUaW1lRm46ICd5ZWFyJyxcbiAgICB0eXBlTmFtZXM6IHtcbiAgICAgIG5vbWluYWw6ICd0ZXh0JyxcbiAgICAgIG9yZGluYWw6ICd0ZXh0LW9yZGluYWwnLFxuICAgICAgcXVhbnRpdGF0aXZlOiAnbnVtYmVyJyxcbiAgICAgIHRlbXBvcmFsOiAndGltZScsXG4gICAgICBnZW9ncmFwaGljOiAnZ2VvJ1xuICAgIH1cbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZShcInZsdWlcIikucnVuKFtcIiR0ZW1wbGF0ZUNhY2hlXCIsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7JHRlbXBsYXRlQ2FjaGUucHV0KFwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFsZXJ0LWJveFxcXCIgbmctc2hvdz1cXFwiQWxlcnRzLmFsZXJ0cy5sZW5ndGggPiAwXFxcIj48ZGl2IGNsYXNzPVxcXCJhbGVydC1pdGVtXFxcIiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIEFsZXJ0cy5hbGVydHNcXFwiPnt7IGFsZXJ0Lm1zZyB9fSA8YSBjbGFzcz1cXFwiY2xvc2VcXFwiIG5nLWNsaWNrPVxcXCJBbGVydHMuY2xvc2VBbGVydCgkaW5kZXgpXFxcIj4mdGltZXM7PC9hPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImJvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuaHRtbFwiLFwiPG1vZGFsIGlkPVxcXCJib29rbWFyay1saXN0XFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1oZWFkZXIgY2FyZCBuby10b3AtbWFyZ2luIG5vLXJpZ2h0LW1hcmdpblxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbiBvbi1jbG9zZT1cXFwibG9nQm9va21hcmtzQ2xvc2VkKClcXFwiPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMiBjbGFzcz1cXFwibm8tYm90dG9tLW1hcmdpblxcXCI+Qm9va21hcmtzICh7eyBCb29rbWFya3MubGVuZ3RoIH19KTwvaDI+PGEgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy5jbGVhcigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2gtb1xcXCI+PC9pPiBDbGVhciBhbGw8L2E+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZmxleC1ncm93LTEgc2Nyb2xsLXlcXFwiPjxkaXYgbmctaWY9XFxcIkJvb2ttYXJrcy5sZW5ndGggPiAwXFxcIiBjbGFzcz1cXFwiaGZsZXggZmxleC13cmFwXFxcIj48dmwtcGxvdC1ncm91cCBuZy1yZXBlYXQ9XFxcImNoYXJ0IGluIEJvb2ttYXJrcy5kaWN0IHwgb3JkZXJPYmplY3RCeSA6IFxcJ3RpbWVBZGRlZFxcJyA6IGZhbHNlXFxcIiBjbGFzcz1cXFwid3JhcHBlZC12bC1wbG90LWdyb3VwIGNhcmRcXFwiIGNoYXJ0PVxcXCJjaGFydFxcXCIgZmllbGQtc2V0PVxcXCJjaGFydC5maWVsZFNldFxcXCIgc2hvdy1ib29rbWFyaz1cXFwidHJ1ZVxcXCIgc2hvdy1kZWJ1Zz1cXFwiY29uc3RzLmRlYnVnXFxcIiBzaG93LWV4cGFuZD1cXFwiZmFsc2VcXFwiIGFsd2F5cy1zZWxlY3RlZD1cXFwidHJ1ZVxcXCIgaGlnaGxpZ2h0ZWQ9XFxcImhpZ2hsaWdodGVkXFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgcHJpb3JpdHk9XFxcImNvbnN0cy5wcmlvcml0eS5ib29rbWFya1xcXCI+PC92bC1wbG90LWdyb3VwPjwvZGl2PjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LWVtcHR5XFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmxlbmd0aCA9PT0gMFxcXCI+WW91IGhhdmUgbm8gYm9va21hcmtzPC9kaXY+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtbXlyaWEtZGF0YXNldFxcXCI+PHA+U2VsZWN0IGEgZGF0YXNldCBmcm9tIHRoZSBNeXJpYSBpbnN0YW5jZSBhdCA8aW5wdXQgbmctbW9kZWw9XFxcIm15cmlhUmVzdFVybFxcXCI+PGJ1dHRvbiBuZy1jbGljaz1cXFwibG9hZERhdGFzZXRzKFxcJ1xcJylcXFwiPnVwZGF0ZTwvYnV0dG9uPi48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KG15cmlhRGF0YXNldClcXFwiPjxkaXY+PHNlbGVjdCBuYW1lPVxcXCJteXJpYS1kYXRhc2V0XFxcIiBpZD1cXFwic2VsZWN0LW15cmlhLWRhdGFzZXRcXFwiIG5nLWRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgbmctbW9kZWw9XFxcIm15cmlhRGF0YXNldFxcXCIgbmctb3B0aW9ucz1cXFwib3B0aW9uTmFtZShkYXRhc2V0KSBmb3IgZGF0YXNldCBpbiBteXJpYURhdGFzZXRzIHRyYWNrIGJ5IGRhdGFzZXQucmVsYXRpb25OYW1lXFxcIj48b3B0aW9uIHZhbHVlPVxcXCJcXFwiPlNlbGVjdCBEYXRhc2V0Li4uPC9vcHRpb24+PC9zZWxlY3Q+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtdXJsLWRhdGFzZXRcXFwiPjxwPkFkZCB0aGUgbmFtZSBvZiB0aGUgZGF0YXNldCBhbmQgdGhlIFVSTCB0byBhIDxiPkpTT048L2I+IG9yIDxiPkNTVjwvYj4gKHdpdGggaGVhZGVyKSBmaWxlLiBNYWtlIHN1cmUgdGhhdCB0aGUgZm9ybWF0dGluZyBpcyBjb3JyZWN0IGFuZCBjbGVhbiB0aGUgZGF0YSBiZWZvcmUgYWRkaW5nIGl0LiBUaGUgYWRkZWQgZGF0YXNldCBpcyBvbmx5IHZpc2libGUgdG8geW91LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZEZyb21VcmwoYWRkZWREYXRhc2V0KVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC11cmxcXFwiPlVSTDwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0LnVybFxcXCIgaWQ9XFxcImRhdGFzZXQtdXJsXFxcIiB0eXBlPVxcXCJ1cmxcXFwiPjxwPk1ha2Ugc3VyZSB0aGF0IHlvdSBob3N0IHRoZSBmaWxlIG9uIGEgc2VydmVyIHRoYXQgaGFzIDxjb2RlPkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbjogKjwvY29kZT4gc2V0LjwvcD48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGFzZXQ8L2J1dHRvbj48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImNoYW5nZS1sb2FkZWQtZGF0YXNldFxcXCI+PGRpdiBuZy1pZj1cXFwidXNlckRhdGEubGVuZ3RoXFxcIj48aDM+VXBsb2FkZWQgRGF0YXNldHM8L2gzPjx1bD48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHVzZXJEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3BhbiBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L3NwYW4+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz48L2xpPjwvdWw+PC9kaXY+PGgzPkV4cGxvcmUgYSBTYW1wbGUgRGF0YXNldDwvaDM+PHVsIGNsYXNzPVxcXCJsb2FkZWQtZGF0YXNldC1saXN0XFxcIj48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHNhbXBsZURhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz4gPGVtIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvZW0+PC9saT48L3VsPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiZGF0YXNldC1tb2RhbFxcXCIgbWF4LXdpZHRoPVxcXCI4MDBweFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMj5BZGQgRGF0YXNldDwvaDI+PC9kaXY+PGRpdiBjbGFzcz1cXFwibW9kYWwtbWFpblxcXCI+PHRhYnNldD48dGFiIGhlYWRpbmc9XFxcIkNoYW5nZSBEYXRhc2V0XFxcIj48Y2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvY2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiUGFzdGUgb3IgVXBsb2FkIERhdGFcXFwiPjxwYXN0ZS1kYXRhc2V0PjwvcGFzdGUtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gVVJMXFxcIj48YWRkLXVybC1kYXRhc2V0PjwvYWRkLXVybC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBNeXJpYVxcXCI+PGFkZC1teXJpYS1kYXRhc2V0PjwvYWRkLW15cmlhLWRhdGFzZXQ+PC90YWI+PC90YWJzZXQ+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sXCIsXCI8YnV0dG9uIGlkPVxcXCJzZWxlY3QtZGF0YVxcXCIgY2xhc3M9XFxcInNtYWxsLWJ1dHRvbiBzZWxlY3QtZGF0YVxcXCIgbmctY2xpY2s9XFxcImxvYWREYXRhc2V0KCk7XFxcIj5DaGFuZ2U8L2J1dHRvbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wem9uZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJwYXN0ZS1kYXRhXFxcIj48ZmlsZS1kcm9wem9uZSBkYXRhc2V0PVxcXCJkYXRhc2V0XFxcIiBtYXgtZmlsZS1zaXplPVxcXCIxMFxcXCIgdmFsaWQtbWltZS10eXBlcz1cXFwiW3RleHQvY3N2LCB0ZXh0L2pzb24sIHRleHQvdHN2XVxcXCI+PGRpdiBjbGFzcz1cXFwidXBsb2FkLWRhdGFcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtZmlsZVxcXCI+RmlsZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJmaWxlXFxcIiBpZD1cXFwiZGF0YXNldC1maWxlXFxcIiBhY2NlcHQ9XFxcInRleHQvY3N2LHRleHQvdHN2XFxcIj48L2Rpdj48cD5VcGxvYWQgYSBDU1YsIG9yIHBhc3RlIGRhdGEgaW4gPGEgaHJlZj1cXFwiaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29tbWEtc2VwYXJhdGVkX3ZhbHVlc1xcXCI+Q1NWPC9hPiBmb3JtYXQgaW50byB0aGUgZmllbGRzLjwvcD48ZGl2IGNsYXNzPVxcXCJkcm9wem9uZS10YXJnZXRcXFwiPjxwPkRyb3AgQ1NWIGZpbGUgaGVyZTwvcD48L2Rpdj48L2Rpdj48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcIm5hbWVcXFwiIG5nLW1vZGVsPVxcXCJkYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjx0ZXh0YXJlYSBuZy1tb2RlbD1cXFwiZGF0YXNldC5kYXRhXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7IHVwZGF0ZU9uOiBcXCdkZWZhdWx0IGJsdXJcXCcsIGRlYm91bmNlOiB7IFxcJ2RlZmF1bHRcXCc6IDE3LCBcXCdibHVyXFwnOiAwIH19XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG4gICAgICA8L3RleHRhcmVhPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YTwvYnV0dG9uPjwvZm9ybT48L2ZpbGUtZHJvcHpvbmU+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sXCIsXCI8c3BhbiBjbGFzcz1cXFwiZmllbGQtaW5mb1xcXCI+PHNwYW4gY2xhc3M9XFxcImhmbGV4IGZ1bGwtd2lkdGhcXFwiIG5nLWNsaWNrPVxcXCJjbGlja2VkKCRldmVudClcXFwiPjxzcGFuIGNsYXNzPVxcXCJ0eXBlLWNhcmV0XFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogIWRpc2FibGVDb3VudENhcmV0IHx8IGZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd25cXFwiIG5nLXNob3c9XFxcInNob3dDYXJldFxcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwidHlwZSBmYSB7e2ljb259fVxcXCIgbmctc2hvdz1cXFwic2hvd1R5cGVcXFwiIHRpdGxlPVxcXCJ7e3R5cGVOYW1lc1tmaWVsZERlZi50eXBlXX19XFxcIj48L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlIT09XFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIG5nLWlmPVxcXCJmdW5jKGZpZWxkRGVmKVxcXCIgY2xhc3M9XFxcImZpZWxkLWZ1bmNcXFwiIG5nLWNsYXNzPVxcXCJ7YW55OiBmaWVsZERlZi5fYW55fVxcXCI+e3sgZnVuYyhmaWVsZERlZikgfX08L3NwYW4+PHNwYW4gY2xhc3M9XFxcImZpZWxkLW5hbWVcXFwiIG5nLWNsYXNzPVxcXCJ7aGFzZnVuYzogZnVuYyhmaWVsZERlZiksIGFueTogZmllbGREZWYuX2FueX1cXFwiPnt7IGZpZWxkRGVmLmZpZWxkIHwgdW5kZXJzY29yZTJzcGFjZSB9fTwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGU9PT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWNvdW50IGZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gY2xhc3M9XFxcImZpZWxkLW5hbWVcXFwiPkNPVU5UPC9zcGFuPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayByZW1vdmVcXFwiIG5nLXNob3c9XFxcInNob3dSZW1vdmVcXFwiPjxhIGNsYXNzPVxcXCJyZW1vdmUtZmllbGRcXFwiIG5nLWNsaWNrPVxcXCJyZW1vdmVBY3Rpb24oKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9hPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayBpbmZvXFxcIiBuZy1zaG93PVxcXCJzaG93SW5mb1xcXCI+PGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgY29udGFpbnNUeXBlKFt2bFR5cGUuTk9NSU5BTCwgdmxUeXBlLk9SRElOQUxdLCBmaWVsZERlZi50eXBlKVxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGREZWYuZmllbGR9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW59fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4fX08YnI+IDxzdHJvbmc+U2FtcGxlOjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXCdzYW1wbGVcXCc+e3tzdGF0cy5zYW1wbGUuam9pbihcXCcsIFxcJyl9fTwvc3Bhbj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+IDxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGZpZWxkRGVmLnR5cGUgPT09IHZsVHlwZS5URU1QT1JBTFxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGREZWYuZmllbGR9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW4gfCBkYXRlOiBzaG9ydH19PGJyPiA8c3Ryb25nPk1heDo8L3N0cm9uZz4ge3tzdGF0cy5tYXggfCBkYXRlOiBzaG9ydH19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPiA8aSBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBmaWVsZERlZi50eXBlID09PSB2bFR5cGUuUVVBTlRJVEFUSVZFXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+TmFtZTo8L3N0cm9uZz4ge3tmaWVsZERlZi5maWVsZH19PGJyPiA8c3Ryb25nPkNhcmRpbmFsaXR5Ojwvc3Ryb25nPiB7e3N0YXRzLmRpc3RpbmN0IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWluOjwvc3Ryb25nPiB7e3N0YXRzLm1pbiB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1heDo8L3N0cm9uZz4ge3tzdGF0cy5tYXggfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5TdGRldjo8L3N0cm9uZz4ge3tzdGF0cy5zdGRldiB8IG51bWJlcjoyfX08YnI+IDxzdHJvbmc+TWVhbjo8L3N0cm9uZz4ge3tzdGF0cy5tZWFuIHwgbnVtYmVyOjJ9fTxicj4gPHN0cm9uZz5NZWRpYW46PC9zdHJvbmc+IHt7c3RhdHMubWVkaWFuIHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+U2FtcGxlOjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXCdzYW1wbGVcXCc+e3tzdGF0cy5zYW1wbGUuam9pbihcXCcsIFxcJyl9fTwvc3Bhbj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+PGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gXFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5Db3VudDo8L3N0cm9uZz4ge3tzdGF0cy5tYXh9fSA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT48L3NwYW4+PC9zcGFuPjwvc3Bhbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJtb2RhbC9tb2RhbC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbFxcXCIgbmctaWY9XFxcImlzT3BlblxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtd3JhcHBlclxcXCIgc3R5bGU9XFxcInt7d3JhcHBlclN0eWxlfX1cXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwibW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PGEgbmctY2xpY2s9XFxcImNsb3NlTW9kYWwoKVxcXCIgY2xhc3M9XFxcInJpZ2h0XFxcIj5DbG9zZTwvYT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0YWJzL3RhYi5odG1sXCIsXCI8ZGl2IG5nLWlmPVxcXCJhY3RpdmVcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGFicy90YWJzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidGFiLWNvbnRhaW5lclxcXCI+PGRpdj48YSBjbGFzcz1cXFwidGFiXFxcIiBuZy1yZXBlYXQ9XFxcInRhYiBpbiB0YWJzZXQudGFic1xcXCIgbmctY2xhc3M9XFxcIntcXCdhY3RpdmVcXCc6IHRhYi5hY3RpdmV9XFxcIiBuZy1jbGljaz1cXFwidGFic2V0LnNob3dUYWIodGFiKVxcXCI+e3t0YWIuaGVhZGluZ319PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRhYi1jb250ZW50c1xcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3QvdmxwbG90Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3RcXFwiIGlkPVxcXCJ2aXMte3t2aXNJZH19XFxcIiBuZy1jbGFzcz1cXFwieyBmaXQ6ICFhbHdheXNTY3JvbGxhYmxlICYmICFvdmVyZmxvdyAmJiAobWF4SGVpZ2h0ICYmICghaGVpZ2h0IHx8IGhlaWdodCA8PSBtYXhIZWlnaHQpKSAmJiAobWF4V2lkdGggJiYgKCF3aWR0aCB8fCB3aWR0aCA8PSBtYXhXaWR0aCkpLCBvdmVyZmxvdzogYWx3YXlzU2Nyb2xsYWJsZSB8fCBvdmVyZmxvdyB8fCAobWF4SGVpZ2h0ICYmIGhlaWdodCAmJiBoZWlnaHQgPiBtYXhIZWlnaHQpIHx8IChtYXhXaWR0aCAmJiB3aWR0aCAmJiB3aWR0aCA+IG1heFdpZHRoKSwgc2Nyb2xsOiBhbHdheXNTY3JvbGxhYmxlIHx8IHVubG9ja2VkIHx8IGhvdmVyRm9jdXMgfVxcXCIgbmctbW91c2Vkb3duPVxcXCJ1bmxvY2tlZD0hdGh1bWJuYWlsXFxcIiBuZy1tb3VzZXVwPVxcXCJ1bmxvY2tlZD1mYWxzZVxcXCIgbmctbW91c2VvdmVyPVxcXCJtb3VzZW92ZXIoKVxcXCIgbmctbW91c2VvdXQ9XFxcIm1vdXNlb3V0KClcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy10b29sdGlwXFxcIiBuZy1zaG93PVxcXCJ0b29sdGlwQWN0aXZlXFxcIj48dGFibGU+PHRyIG5nLXJlcGVhdD1cXFwicCBpbiBkYXRhXFxcIj48dGQgY2xhc3M9XFxcImtleVxcXCI+e3twWzBdfX08L3RkPjx0ZCBjbGFzcz1cXFwidmFsdWVcXFwiPjxiPnt7cFsxXX19PC9iPjwvdGQ+PC90cj48L3RhYmxlPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAgdmZsZXhcXFwiPjxkaXYgbmctc2hvdz1cXFwic2hvd0V4cGFuZCB8fCBmaWVsZFNldCB8fCBzaG93VHJhbnNwb3NlIHx8IHNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWQgfHwgc2hvd1RvZ2dsZVxcXCIgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAtaGVhZGVyIG5vLXNocmlua1xcXCI+PGRpdiBjbGFzcz1cXFwiZmllbGQtc2V0LWluZm9cXFwiPjxmaWVsZC1pbmZvIG5nLXJlcGVhdD1cXFwiZmllbGREZWYgaW4gZmllbGRTZXRcXFwiIG5nLWlmPVxcXCJmaWVsZFNldFxcXCIgZmllbGQtZGVmPVxcXCJmaWVsZERlZlxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBuZy1jbGFzcz1cXFwieyBzZWxlY3RlZDogYWx3YXlzU2VsZWN0ZWQgfHwgKGlzU2VsZWN0ZWQgJiYgaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCkpLCB1bnNlbGVjdGVkOiBpc1NlbGVjdGVkICYmICFpc1NlbGVjdGVkKGZpZWxkRGVmLmZpZWxkKSwgaGlnaGxpZ2h0ZWQ6IChoaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSB9XFxcIiBuZy1tb3VzZW92ZXI9XFxcIihoaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IHRydWVcXFwiIG5nLW1vdXNlb3V0PVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gPSBmYWxzZVxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRvb2xib3hcXFwiPjxhIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXdyZW5jaFxcXCIgbmctY2xpY2s9XFxcInNoQ29waWVkPVxcJ1xcJzsgdmxDb3BpZWQ9XFwnXFwnOyB2Z0NvcGllZD1cXCdcXCc7XFxcIiBuZy1tb3VzZW92ZXI9XFxcImluaXRpYWxpemVQb3B1cCgpO1xcXCI+PC9pPjwvYT48dmwtcGxvdC1ncm91cC1wb3B1cCBuZy1pZj1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1ZyAmJiByZW5kZXJQb3B1cFxcXCI+PC92bC1wbG90LWdyb3VwLXBvcHVwPjxhIG5nLWlmPVxcXCJzaG93TWFya1xcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGlzYWJsZWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1mb250XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1saW5lLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1hcmVhLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1iYXItY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWNpcmNsZS1vXFxcIj48L2k+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneFxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy1yaWdodFxcXCI+PC9pPiA8c21hbGw+TG9nIFg8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctdXBcXFwiPjwvaT4gPHNtYWxsPkxvZyBZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93U29ydCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlU29ydC5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgRGF0YXNldC5zdGF0cylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlU29ydC50b2dnbGUoY2hhcnQudmxTcGVjKVxcXCI+PGkgY2xhc3M9XFxcImZhIHNvcnRcXFwiIG5nLWNsYXNzPVxcXCJ0b2dnbGVTb3J0Q2xhc3MoY2hhcnQudmxTcGVjKVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U29ydDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0ZpbHRlck51bGwgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydChjaGFydC52bFNwZWMsIERhdGFzZXQuc3RhdHMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZUZpbHRlck51bGwoY2hhcnQudmxTcGVjKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGNoYXJ0LnZsU3BlYyAmJiBjaGFydC52bFNwZWMuY2ZnLmZpbHRlck51bGwuT31cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1maWx0ZXJcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkZpbHRlcjwvc21hbGw+IDxzbWFsbD5OVUxMPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93VHJhbnNwb3NlXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRyYW5zcG9zZSgpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcmVmcmVzaCB0cmFuc3Bvc2VcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlN3YXAgWC9ZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy50b2dnbGUoY2hhcnQpXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAhY2hhcnQudmxTcGVjLmVuY29kaW5nLCBhY3RpdmU6IEJvb2ttYXJrcy5pc0Jvb2ttYXJrZWQoY2hhcnQuc2hvcnRoYW5kKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+Qm9va21hcms8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dFeHBhbmRcXFwiIG5nLWNsaWNrPVxcXCJleHBhbmRBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2E+PC9kaXY+PC9kaXY+PHZsLXBsb3QgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xXFxcIiBkYXRhLWZpZWxkc2V0PVxcXCJ7ZmllbGRTZXQua2V5fX1cXFwiIGNoYXJ0PVxcXCJjaGFydFxcXCIgZGlzYWJsZWQ9XFxcImRpc2FibGVkXFxcIiBpcy1pbi1saXN0PVxcXCJpc0luTGlzdFxcXCIgYWx3YXlzLXNjcm9sbGFibGU9XFxcImFsd2F5c1Njcm9sbGFibGVcXFwiIGNvbmZpZy1zZXQ9XFxcInt7Y29uZmlnU2V0fHxcXCdzbWFsbFxcJ319XFxcIiBtYXgtaGVpZ2h0PVxcXCJtYXhIZWlnaHRcXFwiIG1heC13aWR0aD1cXFwibWF4V2lkdGhcXFwiIG92ZXJmbG93PVxcXCJvdmVyZmxvd1xcXCIgcHJpb3JpdHk9XFxcInByaW9yaXR5XFxcIiByZXNjYWxlPVxcXCJyZXNjYWxlXFxcIiB0aHVtYm5haWw9XFxcInRodW1ibmFpbFxcXCIgdG9vbHRpcD1cXFwidG9vbHRpcFxcXCI+PC92bC1wbG90PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInZscGxvdGdyb3VwL3ZscGxvdGdyb3VwcG9wdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgcG9wdXAtY29tbWFuZCBuby1zaHJpbmsgZGV2LXRvb2xcXFwiPjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+VmxzPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwic2hDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC5zaG9ydGhhbmRcXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWTCBzaG9ydGhhbmRcXCcsIGNoYXJ0LnNob3J0aGFuZCk7IHNoQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3NoQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbDwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZsQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuY2xlYW5TcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhLUxpdGVcXCcsIGNoYXJ0LmNsZWFuU3BlYyk7IHZsQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZsQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WZzwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZnQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQudmdTcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhXFwnLCBjaGFydC52Z1NwZWMpOyB2Z0NvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2Z0NvcGllZH19PC9zcGFuPjwvZGl2PjxhIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIiBuZy1ocmVmPVxcXCJ7eyB7dHlwZTpcXCd2bFxcJywgc3BlYzogY2hhcnQuY2xlYW5TcGVjfSB8IHJlcG9ydFVybCB9fVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlJlcG9ydCBCYWQgUmVuZGVyPC9hPiA8YSBuZy1jbGljaz1cXFwic2hvd0ZlYXR1cmU9IXNob3dGZWF0dXJlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+e3tjaGFydC5zY29yZX19PC9hPjxkaXYgbmctcmVwZWF0PVxcXCJmIGluIGNoYXJ0LnNjb3JlRmVhdHVyZXMgdHJhY2sgYnkgZi5yZWFzb25cXFwiPlt7e2Yuc2NvcmV9fV0ge3tmLnJlYXNvbn19PC9kaXY+PC9kaXY+PC9kaXY+XCIpO31dKTsiLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWxlcnRNZXNzYWdlcycsIGZ1bmN0aW9uKEFsZXJ0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2FsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge30sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5BbGVydHMgPSBBbGVydHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0FsZXJ0cycsIGZ1bmN0aW9uKCR0aW1lb3V0LCBfKSB7XG4gICAgdmFyIEFsZXJ0cyA9IHt9O1xuXG4gICAgQWxlcnRzLmFsZXJ0cyA9IFtdO1xuXG4gICAgQWxlcnRzLmFkZCA9IGZ1bmN0aW9uKG1zZywgZGlzbWlzcykge1xuICAgICAgdmFyIG1lc3NhZ2UgPSB7bXNnOiBtc2d9O1xuICAgICAgQWxlcnRzLmFsZXJ0cy5wdXNoKG1lc3NhZ2UpO1xuICAgICAgaWYgKGRpc21pc3MpIHtcbiAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gXy5maW5kSW5kZXgoQWxlcnRzLmFsZXJ0cywgbWVzc2FnZSk7XG4gICAgICAgICAgQWxlcnRzLmNsb3NlQWxlcnQoaW5kZXgpO1xuICAgICAgICB9LCBkaXNtaXNzKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQWxlcnRzLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgQWxlcnRzLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQWxlcnRzO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpib29rbWFya0xpc3RcbiAqIEBkZXNjcmlwdGlvblxuICogIyBib29rbWFya0xpc3RcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdib29rbWFya0xpc3QnLCBmdW5jdGlvbiAoQm9va21hcmtzLCBjb25zdHMsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICAvLyBUaGUgYm9va21hcmsgbGlzdCBpcyBkZXNpZ25lZCB0byByZW5kZXIgd2l0aGluIGEgbW9kYWwgb3ZlcmxheS5cbiAgICAgICAgLy8gQmVjYXVzZSBtb2RhbCBjb250ZW50cyBhcmUgaGlkZGVuIHZpYSBuZy1pZiwgaWYgdGhpcyBsaW5rIGZ1bmN0aW9uIGlzXG4gICAgICAgIC8vIGV4ZWN1dGluZyBpdCBpcyBiZWNhdXNlIHRoZSBkaXJlY3RpdmUgaXMgYmVpbmcgc2hvd24uIExvZyB0aGUgZXZlbnQ6XG4gICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19PUEVOKTtcbiAgICAgICAgc2NvcGUubG9nQm9va21hcmtzQ2xvc2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMT1NFKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Cb29rbWFya3NcbiAqIEBkZXNjcmlwdGlvblxuICogIyBCb29rbWFya3NcbiAqIFNlcnZpY2UgaW4gdGhlIHZsdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0Jvb2ttYXJrcycsIGZ1bmN0aW9uKF8sIHZsLCBsb2NhbFN0b3JhZ2VTZXJ2aWNlLCBMb2dnZXIsIERhdGFzZXQpIHtcbiAgICB2YXIgQm9va21hcmtzID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICAgIHRoaXMuaXNTdXBwb3J0ZWQgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzU3VwcG9ydGVkO1xuICAgIH07XG5cbiAgICB2YXIgcHJvdG8gPSBCb29rbWFya3MucHJvdG90eXBlO1xuXG4gICAgcHJvdG8udXBkYXRlTGVuZ3RoID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxlbmd0aCA9IE9iamVjdC5rZXlzKHRoaXMuZGljdCkubGVuZ3RoO1xuICAgIH07XG5cbiAgICBwcm90by5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICBsb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldCgnYm9va21hcmtzJywgdGhpcy5kaWN0KTtcbiAgICB9O1xuXG4gICAgcHJvdG8ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0gbG9jYWxTdG9yYWdlU2VydmljZS5nZXQoJ2Jvb2ttYXJrcycpIHx8IHt9O1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IHt9O1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQ0xFQVIpO1xuICAgIH07XG5cbiAgICBwcm90by50b2dnbGUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgaWYgKHRoaXMuZGljdFtzaG9ydGhhbmRdKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKGNoYXJ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWRkKGNoYXJ0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcHJvdG8uYWRkID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcnLCBjaGFydC52bFNwZWMsIHNob3J0aGFuZCk7XG5cbiAgICAgIGNoYXJ0LnRpbWVBZGRlZCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cbiAgICAgIGNoYXJ0LnN0YXRzID0gRGF0YXNldC5zdGF0cztcblxuICAgICAgdGhpcy5kaWN0W3Nob3J0aGFuZF0gPSBfLmNsb25lRGVlcChjaGFydCk7XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19BREQsIHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygncmVtb3ZpbmcnLCBjaGFydC52bFNwZWMsIHNob3J0aGFuZCk7XG5cbiAgICAgIGRlbGV0ZSB0aGlzLmRpY3Rbc2hvcnRoYW5kXTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX1JFTU9WRSwgc2hvcnRoYW5kKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uaXNCb29rbWFya2VkID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICByZXR1cm4gc2hvcnRoYW5kIGluIHRoaXMuZGljdDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBCb29rbWFya3MoKTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHRoZSBzcGVjIGNvbmZpZy5cbi8vIFdlIGtlZXAgdGhpcyBzZXBhcmF0ZSBzbyB0aGF0IGNoYW5nZXMgYXJlIGtlcHQgZXZlbiBpZiB0aGUgc3BlYyBjaGFuZ2VzLlxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnQ29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLmRhdGEgPSB7fTtcbiAgICBDb25maWcuY29uZmlnID0ge307XG5cbiAgICBDb25maWcuZ2V0Q29uZmlnID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfTtcblxuICAgIENvbmZpZy5nZXREYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gQ29uZmlnLmRhdGE7XG4gICAgfTtcblxuICAgIENvbmZpZy5sYXJnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2VsbDoge1xuICAgICAgICAgIHdpZHRoOiA0MDAsXG4gICAgICAgICAgaGVpZ2h0OiA0MDBcbiAgICAgICAgfSxcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAyMDBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy5zbWFsbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMTUwLFxuICAgICAgICAgICAgaGVpZ2h0OiAxNTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy51cGRhdGVEYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCwgdHlwZSkge1xuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIENvbmZpZy5kYXRhLnZhbHVlcyA9IGRhdGFzZXQudmFsdWVzO1xuICAgICAgICBkZWxldGUgQ29uZmlnLmRhdGEudXJsO1xuICAgICAgICBDb25maWcuZGF0YS5mb3JtYXRUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudXJsID0gZGF0YXNldC51cmw7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS52YWx1ZXM7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB0eXBlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gQ29uZmlnO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRNeXJpYURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRNeXJpYURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRNeXJpYURhdGFzZXQnLCBmdW5jdGlvbiAoJGh0dHAsIERhdGFzZXQsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5teXJpYVJlc3RVcmwgPSBjb25zdHMubXlyaWFSZXN0O1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gW107XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzID0gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC9zZWFyY2gvP3E9JyArIHF1ZXJ5KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBMb2FkIHRoZSBhdmFpbGFibGUgZGF0YXNldHMgZnJvbSBNeXJpYVxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMoJycpO1xuXG4gICAgICAgIHNjb3BlLm9wdGlvbk5hbWUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQudXNlck5hbWUgKyAnOicgKyBkYXRhc2V0LnByb2dyYW1OYW1lICsgJzonICsgZGF0YXNldC5yZWxhdGlvbk5hbWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKG15cmlhRGF0YXNldCkge1xuICAgICAgICAgIHZhciBkYXRhc2V0ID0ge1xuICAgICAgICAgICAgZ3JvdXA6ICdteXJpYScsXG4gICAgICAgICAgICBuYW1lOiBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lLFxuICAgICAgICAgICAgdXJsOiBzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvdXNlci0nICsgbXlyaWFEYXRhc2V0LnVzZXJOYW1lICtcbiAgICAgICAgICAgICAgJy9wcm9ncmFtLScgKyBteXJpYURhdGFzZXQucHJvZ3JhbU5hbWUgK1xuICAgICAgICAgICAgICAnL3JlbGF0aW9uLScgKyBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lICsgJy9kYXRhP2Zvcm1hdD1qc29uJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRVcmxEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkVXJsRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZFVybERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgZGF0YXNldCB0byBhZGRcbiAgICAgICAgc2NvcGUuYWRkZWREYXRhc2V0ID0ge1xuICAgICAgICAgIGdyb3VwOiAndXNlcidcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGRGcm9tVXJsID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19VUkwsIGRhdGFzZXQudXJsKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gRmV0Y2ggJiBhY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmluR3JvdXBcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGluR3JvdXBcbiAqIEdldCBkYXRhc2V0cyBpbiBhIHBhcnRpY3VsYXIgZ3JvdXBcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YXNldEdyb3VwIE9uZSBvZiBcInNhbXBsZSxcIiBcInVzZXJcIiwgb3IgXCJteXJpYVwiXG4gKiBAcmV0dXJuIHtBcnJheX0gQW4gYXJyYXkgb2YgZGF0YXNldHMgaW4gdGhlIHNwZWNpZmllZCBncm91cFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2luR3JvdXAnLCBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgZGF0YXNldEdyb3VwKSB7XG4gICAgICByZXR1cm4gXy53aGVyZShhcnIsIHtcbiAgICAgICAgZ3JvdXA6IGRhdGFzZXRHcm91cFxuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Y2hhbmdlTG9hZGVkRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGNoYW5nZUxvYWRlZERhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdjaGFuZ2VMb2FkZWREYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIF8pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4cG9zZSBkYXRhc2V0IG9iamVjdCBpdHNlbGYgc28gY3VycmVudCBkYXRhc2V0IGNhbiBiZSBtYXJrZWRcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQuZ3JvdXAgIT09ICdzYW1wbGUnO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5zYW1wbGVEYXRhID0gXy53aGVyZShEYXRhc2V0LmRhdGFzZXRzLCB7XG4gICAgICAgICAgZ3JvdXA6ICdzYW1wbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gRGF0YXNldC5kYXRhc2V0cy5sZW5ndGg7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFzZXQuZ3JvdXAgIT09ICdzYW1wbGUnO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5zZWxlY3REYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoZGF0YXNldCk7XG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBnZXROYW1lTWFwKGRhdGFzY2hlbWEpIHtcbiAgcmV0dXJuIGRhdGFzY2hlbWEucmVkdWNlKGZ1bmN0aW9uKG0sIGZpZWxkRGVmKSB7XG4gICAgbVtmaWVsZERlZi5maWVsZF0gPSBmaWVsZERlZjtcbiAgICByZXR1cm4gbTtcbiAgfSwge30pO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdEYXRhc2V0JywgZnVuY3Rpb24oJGh0dHAsICRxLCBBbGVydHMsIF8sIHZnLCB2bCwgU2FtcGxlRGF0YSwgQ29uZmlnLCBMb2dnZXIpIHtcbiAgICB2YXIgRGF0YXNldCA9IHt9O1xuXG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBzYW1wbGUgZGF0YXNldHNcbiAgICB2YXIgZGF0YXNldHMgPSBTYW1wbGVEYXRhO1xuXG4gICAgRGF0YXNldC5kYXRhc2V0cyA9IGRhdGFzZXRzO1xuICAgIERhdGFzZXQuZGF0YXNldCA9IGRhdGFzZXRzWzFdO1xuICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSB1bmRlZmluZWQ7ICAvLyBkYXRhc2V0IGJlZm9yZSB1cGRhdGVcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBbXTtcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEuYnlOYW1lID0ge307XG4gICAgRGF0YXNldC5zdGF0cyA9IHt9O1xuICAgIERhdGFzZXQudHlwZSA9IHVuZGVmaW5lZDtcblxuICAgIHZhciB0eXBlT3JkZXIgPSB7XG4gICAgICBub21pbmFsOiAwLFxuICAgICAgb3JkaW5hbDogMCxcbiAgICAgIGdlb2dyYXBoaWM6IDIsXG4gICAgICB0ZW1wb3JhbDogMyxcbiAgICAgIHF1YW50aXRhdGl2ZTogNFxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeSA9IHt9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlPT09J2NvdW50JykgcmV0dXJuIDQ7XG4gICAgICByZXR1cm4gdHlwZU9yZGVyW2ZpZWxkRGVmLnR5cGVdO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgcmV0dXJuIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGUoZmllbGREZWYpICsgJ18nICtcbiAgICAgICAgKGZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JyA/ICd+JyA6IGZpZWxkRGVmLmZpZWxkLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAvLyB+IGlzIHRoZSBsYXN0IGNoYXJhY3RlciBpbiBBU0NJSVxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5vcmlnaW5hbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIDA7IC8vIG5vIHN3YXAgd2lsbCBvY2N1clxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gZmllbGREZWYuZmllbGQ7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmNhcmRpbmFsaXR5ID0gZnVuY3Rpb24oZmllbGREZWYsIHN0YXRzKSB7XG4gICAgICByZXR1cm4gc3RhdHNbZmllbGREZWYuZmllbGRdLmRpc3RpbmN0O1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXIgPSBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWU7XG5cbiAgICBEYXRhc2V0LmdldFNjaGVtYSA9IGZ1bmN0aW9uKGRhdGEsIHN0YXRzLCBvcmRlcikge1xuICAgICAgdmFyIHR5cGVzID0gdmcudXRpbC50eXBlLmluZmVyQWxsKGRhdGEpLFxuICAgICAgICBzY2hlbWEgPSBfLnJlZHVjZSh0eXBlcywgZnVuY3Rpb24ocywgdHlwZSwgZmllbGQpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgICB0eXBlOiB2bC5kYXRhLnR5cGVzW3R5cGVdLFxuICAgICAgICAgICAgcHJpbWl0aXZlVHlwZTogdHlwZVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoZmllbGREZWYudHlwZSA9PT0gdmwudHlwZS5RVUFOVElUQVRJVkUgJiYgc3RhdHNbZmllbGREZWYuZmllbGRdLmRpc3RpbmN0IDw9IDUpIHtcbiAgICAgICAgICAgIGZpZWxkRGVmLnR5cGUgPSB2bC50eXBlLk9SRElOQUw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcy5wdXNoKGZpZWxkRGVmKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSwgW10pO1xuXG4gICAgICBzY2hlbWEgPSB2Zy51dGlsLnN0YWJsZXNvcnQoc2NoZW1hLCBvcmRlciB8fCBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUsIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkKTtcblxuICAgICAgc2NoZW1hLnB1c2godmwuZmllbGREZWYuY291bnQoKSk7XG4gICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH07XG5cbiAgICAvLyB1cGRhdGUgdGhlIHNjaGVtYSBhbmQgc3RhdHNcbiAgICBEYXRhc2V0Lm9uVXBkYXRlID0gW107XG5cbiAgICBEYXRhc2V0LnVwZGF0ZSA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgIHZhciB1cGRhdGVQcm9taXNlO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9DSEFOR0UsIGRhdGFzZXQubmFtZSk7XG5cbiAgICAgIGlmIChkYXRhc2V0LnZhbHVlcykge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgIERhdGFzZXQudHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZUZyb21EYXRhKGRhdGFzZXQsIGRhdGFzZXQudmFsdWVzKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRodHRwLmdldChkYXRhc2V0LnVybCwge2NhY2hlOiB0cnVlfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgIHZhciBkYXRhO1xuXG4gICAgICAgICAgLy8gZmlyc3Qgc2VlIHdoZXRoZXIgdGhlIGRhdGEgaXMgSlNPTiwgb3RoZXJ3aXNlIHRyeSB0byBwYXJzZSBDU1ZcbiAgICAgICAgICBpZiAoXy5pc09iamVjdChyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YSA9IHZnLnV0aWwucmVhZChyZXNwb25zZS5kYXRhLCB7dHlwZTogJ2Nzdid9KTtcbiAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdjc3YnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBEYXRhc2V0Lm9uVXBkYXRlLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9IHVwZGF0ZVByb21pc2UudGhlbihsaXN0ZW5lcik7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ29weSB0aGUgZGF0YXNldCBpbnRvIHRoZSBjb25maWcgc2VydmljZSBvbmNlIGl0IGlzIHJlYWR5XG4gICAgICB1cGRhdGVQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbmZpZy51cGRhdGVEYXRhc2V0KGRhdGFzZXQsIERhdGFzZXQudHlwZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHVwZGF0ZVByb21pc2U7XG4gICAgfTtcblxuICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEgPSBmdW5jdGlvbihkYXRhc2V0LCBkYXRhKSB7XG4gICAgICBEYXRhc2V0LmRhdGEgPSBkYXRhO1xuXG4gICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgIERhdGFzZXQuc3RhdHMgPSB2Zy51dGlsLnN1bW1hcnkoZGF0YSkucmVkdWNlKGZ1bmN0aW9uKHMsIHByb2ZpbGUpIHtcbiAgICAgICAgc1twcm9maWxlLmZpZWxkXSA9IHByb2ZpbGU7XG4gICAgICAgIHJldHVybiBzO1xuICAgICAgfSwge1xuICAgICAgICAnKic6IHtcbiAgICAgICAgICBtYXg6IGRhdGEubGVuZ3RoLFxuICAgICAgICAgIG1pbjogMFxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZm9yICh2YXIgZmllbGROYW1lIGluIERhdGFzZXQuc3RhdHMpIHtcbiAgICAgICAgaWYgKGZpZWxkTmFtZSAhPT0gJyonKSB7XG4gICAgICAgICAgRGF0YXNldC5zdGF0c1tmaWVsZE5hbWVdLnNhbXBsZSA9IF8uc2FtcGxlKF8ubWFwKERhdGFzZXQuZGF0YSwgZmllbGROYW1lKSwgNyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgRGF0YXNldC5kYXRhc2NoZW1hID0gRGF0YXNldC5nZXRTY2hlbWEoRGF0YXNldC5kYXRhLCBEYXRhc2V0LnN0YXRzKTtcbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSBnZXROYW1lTWFwKERhdGFzZXQuZGF0YXNjaGVtYSk7XG4gICAgfTtcblxuICAgIERhdGFzZXQuYWRkID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgaWYgKCFkYXRhc2V0LmlkKSB7XG4gICAgICAgIGRhdGFzZXQuaWQgPSBkYXRhc2V0LnVybDtcbiAgICAgIH1cbiAgICAgIGRhdGFzZXRzLnB1c2goZGF0YXNldCk7XG5cbiAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF0YXNldDtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZGF0YXNldE1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZGF0YXNldE1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldE1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiBmYWxzZVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRTZWxlY3RvcicsIGZ1bmN0aW9uKE1vZGFscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9PUEVOKTtcbiAgICAgICAgICBNb2RhbHMub3BlbignZGF0YXNldC1tb2RhbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpbGVEcm9wem9uZVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpbGVEcm9wem9uZVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC8vIEFkZCB0aGUgZmlsZSByZWFkZXIgYXMgYSBuYW1lZCBkZXBlbmRlbmN5XG4gIC5jb25zdGFudCgnRmlsZVJlYWRlcicsIHdpbmRvdy5GaWxlUmVhZGVyKVxuICAuZGlyZWN0aXZlKCdmaWxlRHJvcHpvbmUnLCBmdW5jdGlvbiAoTW9kYWxzLCBBbGVydHMsIEZpbGVSZWFkZXIpIHtcblxuICAgIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgICBmdW5jdGlvbiBpc1NpemVWYWxpZChzaXplLCBtYXhTaXplKSB7XG4gICAgICAvLyBTaXplIGlzIHByb3ZpZGVkIGluIGJ5dGVzOyBtYXhTaXplIGlzIHByb3ZpZGVkIGluIG1lZ2FieXRlc1xuICAgICAgLy8gQ29lcmNlIG1heFNpemUgdG8gYSBudW1iZXIgaW4gY2FzZSBpdCBjb21lcyBpbiBhcyBhIHN0cmluZyxcbiAgICAgIC8vICYgcmV0dXJuIHRydWUgd2hlbiBtYXggZmlsZSBzaXplIHdhcyBub3Qgc3BlY2lmaWVkLCBpcyBlbXB0eSxcbiAgICAgIC8vIG9yIGlzIHN1ZmZpY2llbnRseSBsYXJnZVxuICAgICAgcmV0dXJuICFtYXhTaXplIHx8ICggc2l6ZSAvIDEwMjQgLyAxMDI0IDwgK21heFNpemUgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1R5cGVWYWxpZCh0eXBlLCB2YWxpZE1pbWVUeXBlcykge1xuICAgICAgICAvLyBJZiBubyBtaW1lIHR5cGUgcmVzdHJpY3Rpb25zIHdlcmUgcHJvdmlkZWQsIG9yIHRoZSBwcm92aWRlZCBmaWxlJ3NcbiAgICAgICAgLy8gdHlwZSBpcyB3aGl0ZWxpc3RlZCwgdHlwZSBpcyB2YWxpZFxuICAgICAgcmV0dXJuICF2YWxpZE1pbWVUeXBlcyB8fCAoIHZhbGlkTWltZVR5cGVzLmluZGV4T2YodHlwZSkgPiAtMSApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAvLyBQZXJtaXQgYXJiaXRyYXJ5IGNoaWxkIGNvbnRlbnRcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBtYXhGaWxlU2l6ZTogJ0AnLFxuICAgICAgICB2YWxpZE1pbWVUeXBlczogJ0AnLFxuICAgICAgICAvLyBFeHBvc2UgdGhpcyBkaXJlY3RpdmUncyBkYXRhc2V0IHByb3BlcnR5IHRvIHBhcmVudCBzY29wZXMgdGhyb3VnaFxuICAgICAgICAvLyB0d28td2F5IGRhdGFiaW5kaW5nXG4gICAgICAgIGRhdGFzZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudC8qLCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSBzY29wZS5kYXRhc2V0IHx8IHt9O1xuXG4gICAgICAgIGVsZW1lbnQub24oJ2RyYWdvdmVyIGRyYWdlbnRlcicsIGZ1bmN0aW9uIG9uRHJhZ0VudGVyKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ2NvcHknO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiByZWFkRmlsZShmaWxlKSB7XG4gICAgICAgICAgaWYgKCFpc1R5cGVWYWxpZChmaWxlLnR5cGUsIHNjb3BlLnZhbGlkTWltZVR5cGVzKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdJbnZhbGlkIGZpbGUgdHlwZS4gRmlsZSBtdXN0IGJlIG9uZSBvZiBmb2xsb3dpbmcgdHlwZXM6ICcgKyBzY29wZS52YWxpZE1pbWVUeXBlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NpemVWYWxpZChmaWxlLnNpemUsIHNjb3BlLm1heEZpbGVTaXplKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdGaWxlIG11c3QgYmUgc21hbGxlciB0aGFuICcgKyBzY29wZS5tYXhGaWxlU2l6ZSArICcgTUInKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS4kYXBwbHkoZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5kYXRhID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFN0cmlwIGZpbGUgbmFtZSBleHRlbnNpb25zIGZyb20gdGhlIHVwbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5uYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlxcdyskLywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdFcnJvciByZWFkaW5nIGZpbGUnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50Lm9uKCdkcm9wJywgZnVuY3Rpb24gb25Ecm9wKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlYWRGaWxlKGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWxlbWVudC5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBvblVwbG9hZCgvKmV2ZW50Ki8pIHtcbiAgICAgICAgICAvLyBcInRoaXNcIiBpcyB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgIHJlYWRGaWxlKHRoaXMuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnBhc3RlRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHBhc3RlRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Bhc3RlRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIsIENvbmZpZywgXywgdmcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICBkYXRhOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IHZnLnV0aWwucmVhZChzY29wZS5kYXRhc2V0LmRhdGEsIHtcbiAgICAgICAgICAgIHR5cGU6ICdjc3YnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgcGFzdGVkRGF0YXNldCA9IHtcbiAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLCAgLy8gdGltZSBhcyBpZFxuICAgICAgICAgICAgbmFtZTogc2NvcGUuZGF0YXNldC5uYW1lLFxuICAgICAgICAgICAgdmFsdWVzOiBkYXRhLFxuICAgICAgICAgICAgZ3JvdXA6ICdwYXN0ZWQnXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIExvZyB0aGF0IHdlIGhhdmUgcGFzdGVkIGRhdGFcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfUEFTVEUsIHBhc3RlZERhdGFzZXQubmFtZSk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgcGFzdGVkIGRhdGEgYXMgYSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKHBhc3RlZERhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBDbG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGNvbnRhaW5pbmcgbW9kYWxcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJykuY29uc3RhbnQoJ1NhbXBsZURhdGEnLCBbe1xuICBuYW1lOiAnQmFybGV5JyxcbiAgZGVzY3JpcHRpb246ICdCYXJsZXkgeWllbGQgYnkgdmFyaWV0eSBhY3Jvc3MgdGhlIHVwcGVyIG1pZHdlc3QgaW4gMTkzMSBhbmQgMTkzMicsXG4gIHVybDogJ2RhdGEvYmFybGV5Lmpzb24nLFxuICBpZDogJ2JhcmxleScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYXJzJyxcbiAgZGVzY3JpcHRpb246ICdBdXRvbW90aXZlIHN0YXRpc3RpY3MgZm9yIGEgdmFyaWV0eSBvZiBjYXIgbW9kZWxzIGJldHdlZW4gMTk3MCAmIDE5ODInLFxuICB1cmw6ICdkYXRhL2NhcnMuanNvbicsXG4gIGlkOiAnY2FycycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDcmltZWEnLFxuICB1cmw6ICdkYXRhL2NyaW1lYS5qc29uJyxcbiAgaWQ6ICdjcmltZWEnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnRHJpdmluZycsXG4gIHVybDogJ2RhdGEvZHJpdmluZy5qc29uJyxcbiAgaWQ6ICdkcml2aW5nJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0lyaXMnLFxuICB1cmw6ICdkYXRhL2lyaXMuanNvbicsXG4gIGlkOiAnaXJpcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdKb2JzJyxcbiAgdXJsOiAnZGF0YS9qb2JzLmpzb24nLFxuICBpZDogJ2pvYnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnUG9wdWxhdGlvbicsXG4gIHVybDogJ2RhdGEvcG9wdWxhdGlvbi5qc29uJyxcbiAgaWQ6ICdwb3B1bGF0aW9uJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ01vdmllcycsXG4gIHVybDogJ2RhdGEvbW92aWVzLmpzb24nLFxuICBpZDogJ21vdmllcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCaXJkc3RyaWtlcycsXG4gIHVybDogJ2RhdGEvYmlyZHN0cmlrZXMuanNvbicsXG4gIGlkOiAnYmlyZHN0cmlrZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQnVydGluJyxcbiAgdXJsOiAnZGF0YS9idXJ0aW4uanNvbicsXG4gIGlkOiAnYnVydGluJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhbXBhaWducycsXG4gIHVybDogJ2RhdGEvd2ViYWxsMjYuanNvbicsXG4gIGlkOiAnd2ViYWxsMjYnLFxuICBncm91cDogJ3NhbXBsZSdcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWVsZEluZm9cbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWVsZEluZm9cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdmaWVsZEluZm8nLCBmdW5jdGlvbiAoRGF0YXNldCwgRHJvcCwgdmwsIGNvbnN0cywgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2ZpZWxkaW5mby9maWVsZGluZm8uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpZWxkRGVmOiAnPScsXG4gICAgICAgIHNob3dUeXBlOiAnPScsXG4gICAgICAgIHNob3dJbmZvOiAnPScsXG4gICAgICAgIHNob3dDYXJldDogJz0nLFxuICAgICAgICBwb3B1cENvbnRlbnQ6ICc9JyxcbiAgICAgICAgc2hvd1JlbW92ZTogJz0nLFxuICAgICAgICByZW1vdmVBY3Rpb246ICcmJyxcbiAgICAgICAgYWN0aW9uOiAnJicsXG4gICAgICAgIGRpc2FibGVDb3VudENhcmV0OiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgZnVuY3NQb3B1cDtcbiAgICAgICAgc2NvcGUudmxUeXBlID0gdmwudHlwZTtcbiAgICAgICAgc2NvcGUudHlwZU5hbWVzID0gY29uc3RzLnR5cGVOYW1lcztcbiAgICAgICAgc2NvcGUuc3RhdHMgPSBEYXRhc2V0LnN0YXRzW3Njb3BlLmZpZWxkRGVmLmZpZWxkXTtcbiAgICAgICAgc2NvcGUuY29udGFpbnNUeXBlID0gZnVuY3Rpb24odHlwZXMsIHR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gXy5pbmNsdWRlcyh0eXBlcywgdHlwZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc3dpdGNoKHNjb3BlLmZpZWxkRGVmLnR5cGUpe1xuICAgICAgICAgIGNhc2UgdmwudHlwZS5PUkRJTkFMOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1mb250JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgdmwudHlwZS5OT01JTkFMOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1mb250JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgdmwudHlwZS5RVUFOVElUQVRJVkU6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ljb24taGFzaCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuVEVNUE9SQUw6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ZhLWNhbGVuZGFyJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuY2xpY2tlZCA9IGZ1bmN0aW9uKCRldmVudCl7XG4gICAgICAgICAgaWYoc2NvcGUuYWN0aW9uICYmICRldmVudC50YXJnZXQgIT09IGVsZW1lbnQuZmluZCgnLmZhLWNhcmV0LWRvd24nKVswXSAmJlxuICAgICAgICAgICAgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCdzcGFuLnR5cGUnKVswXSkge1xuICAgICAgICAgICAgc2NvcGUuYWN0aW9uKCRldmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZ1bmMgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgICAgIHJldHVybiBmaWVsZERlZi5hZ2dyZWdhdGUgfHwgZmllbGREZWYudGltZVVuaXQgfHxcbiAgICAgICAgICAgIChmaWVsZERlZi5iaW4gJiYgJ2JpbicpIHx8XG4gICAgICAgICAgICBmaWVsZERlZi5fYWdncmVnYXRlIHx8IGZpZWxkRGVmLl90aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkRGVmLl9iaW4gJiYgJ2JpbicpIHx8IChmaWVsZERlZi5fYW55ICYmICdhdXRvJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKCdwb3B1cENvbnRlbnQnLCBmdW5jdGlvbihwb3B1cENvbnRlbnQpIHtcbiAgICAgICAgICBpZiAoIXBvcHVwQ29udGVudCkgeyByZXR1cm47IH1cblxuICAgICAgICAgIGlmIChmdW5jc1BvcHVwKSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmdW5jc1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgICAgY29udGVudDogcG9wdXBDb250ZW50LFxuICAgICAgICAgICAgdGFyZ2V0OiBlbGVtZW50LmZpbmQoJy50eXBlLWNhcmV0JylbMF0sXG4gICAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSBsZWZ0JyxcbiAgICAgICAgICAgIG9wZW5PbjogJ2NsaWNrJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXAgJiYgZnVuY3NQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csIGNvbnN0cywgQW5hbHl0aWNzKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5sZXZlbHMgPSB7XG4gICAgICBPRkY6IHtpZDonT0ZGJywgcmFuazowfSxcbiAgICAgIFRSQUNFOiB7aWQ6J1RSQUNFJywgcmFuazoxfSxcbiAgICAgIERFQlVHOiB7aWQ6J0RFQlVHJywgcmFuazoyfSxcbiAgICAgIElORk86IHtpZDonSU5GTycsIHJhbms6M30sXG4gICAgICBXQVJOOiB7aWQ6J1dBUk4nLCByYW5rOjR9LFxuICAgICAgRVJST1I6IHtpZDonRVJST1InLCByYW5rOjV9LFxuICAgICAgRkFUQUw6IHtpZDonRkFUQUwnLCByYW5rOjZ9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuYWN0aW9ucyA9IHtcbiAgICAgIC8vIERBVEFcbiAgICAgIElOSVRJQUxJWkU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0lOSVRJQUxJWkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgVU5ETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnVU5ETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFJFRE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1JFRE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX0NIQU5HRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX09QRU46IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1BBU1RFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19QQVNURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1VSTDoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfVVJMJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQk9PS01BUktcbiAgICAgIEJPT0tNQVJLX0FERDoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQUREJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfUkVNT1ZFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19SRU1PVkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19PUEVOOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xPU0U6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xFQVI6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICBDTFVTVEVSX1NFTEVDVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0xVU1RFUl9TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0FEX01PUkU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0xPQURfTU9SRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gRklFTERTXG4gICAgICBGSUVMRFNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUVMRFNfUkVTRVQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX1JFU0VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRlVOQ19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRlVOQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vUE9MRVNUQVJcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBGSUVMRF9EUk9QOiB7Y2F0ZWdvcnk6ICdQT0xFU1RBUicsIGlkOiAnRklFTERfRFJPUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uLCBsYWJlbCwgZGF0YSkge1xuICAgICAgaWYgKCFjb25zdHMubG9nZ2luZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWUgPSBkYXRhID8gZGF0YS52YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmKGFjdGlvbi5sZXZlbC5yYW5rID49IHNlcnZpY2UubGV2ZWxzLklORk8ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbihzZXJ2aWNlLmFjdGlvbnMuSU5JVElBTElaRSwgY29uc3RzLmFwcElkKTtcblxuICAgIHJldHVybiBzZXJ2aWNlO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWwnLCBmdW5jdGlvbiAoJGRvY3VtZW50LCBNb2RhbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgYXV0b09wZW46ICc9JyxcbiAgICAgICAgbWF4V2lkdGg6ICdAJ1xuICAgICAgfSxcbiAgICAgIC8vIFByb3ZpZGUgYW4gaW50ZXJmYWNlIGZvciBjaGlsZCBkaXJlY3RpdmVzIHRvIGNsb3NlIHRoaXMgbW9kYWxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICB2YXIgbW9kYWxJZCA9IGF0dHJzLmlkO1xuXG4gICAgICAgIGlmIChzY29wZS5tYXhXaWR0aCkge1xuICAgICAgICAgIHNjb3BlLndyYXBwZXJTdHlsZSA9ICdtYXgtd2lkdGg6JyArIHNjb3BlLm1heFdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byBjbG9zZWQgdW5sZXNzIGF1dG9PcGVuIGlzIHNldFxuICAgICAgICBzY29wZS5pc09wZW4gPSBzY29wZS5hdXRvT3BlbjtcblxuICAgICAgICAvLyBjbG9zZSBvbiBlc2NcbiAgICAgICAgZnVuY3Rpb24gZXNjYXBlKGUpIHtcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAyNyAmJiBzY29wZS5pc09wZW4pIHtcbiAgICAgICAgICAgIHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgZXNjYXBlKTtcblxuICAgICAgICAvLyBSZWdpc3RlciB0aGlzIG1vZGFsIHdpdGggdGhlIHNlcnZpY2VcbiAgICAgICAgTW9kYWxzLnJlZ2lzdGVyKG1vZGFsSWQsIHNjb3BlKTtcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIE1vZGFscy5kZXJlZ2lzdGVyKG1vZGFsSWQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbENsb3NlQnV0dG9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxDbG9zZUJ1dHRvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsQ2xvc2VCdXR0b24nLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXm1vZGFsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgICdjbG9zZUNhbGxiYWNrJzogJyZvbkNsb3NlJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIHNjb3BlLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICBpZiAoc2NvcGUuY2xvc2VDYWxsYmFjaykge1xuICAgICAgICAgICAgc2NvcGUuY2xvc2VDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Nb2RhbHNcbiAqIEBkZXNjcmlwdGlvblxuICogIyBNb2RhbHNcbiAqIFNlcnZpY2UgdXNlZCB0byBjb250cm9sIG1vZGFsIHZpc2liaWxpdHkgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwbGljYXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnTW9kYWxzJywgZnVuY3Rpb24gKCRjYWNoZUZhY3RvcnkpIHtcblxuICAgIC8vIFRPRE86IFRoZSB1c2Ugb2Ygc2NvcGUgaGVyZSBhcyB0aGUgbWV0aG9kIGJ5IHdoaWNoIGEgbW9kYWwgZGlyZWN0aXZlXG4gICAgLy8gaXMgcmVnaXN0ZXJlZCBhbmQgY29udHJvbGxlZCBtYXkgbmVlZCB0byBjaGFuZ2UgdG8gc3VwcG9ydCByZXRyaWV2aW5nXG4gICAgLy8gZGF0YSBmcm9tIGEgbW9kYWwgYXMgbWF5IGJlIG5lZWRlZCBpbiAjNzdcbiAgICB2YXIgbW9kYWxzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdtb2RhbHMnKTtcblxuICAgIC8vIFB1YmxpYyBBUElcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkLCBzY29wZSkge1xuICAgICAgICBpZiAobW9kYWxzQ2FjaGUuZ2V0KGlkKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nhbm5vdCByZWdpc3RlciB0d28gbW9kYWxzIHdpdGggaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxzQ2FjaGUucHV0KGlkLCBzY29wZSk7XG4gICAgICB9LFxuXG4gICAgICBkZXJlZ2lzdGVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gT3BlbiBhIG1vZGFsXG4gICAgICBvcGVuOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICB9LFxuXG4gICAgICAvLyBDbG9zZSBhIG1vZGFsXG4gICAgICBjbG9zZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgIH0sXG5cbiAgICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICB9LFxuXG4gICAgICBjb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RhbHNDYWNoZS5pbmZvKCkuc2l6ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VydmljZSBmb3Igc2VydmluZyBWTCBTY2hlbWFcbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ1NjaGVtYScsIGZ1bmN0aW9uKHZsU2NoZW1hKSB7XG4gICAgdmFyIFNjaGVtYSA9IHt9O1xuXG4gICAgU2NoZW1hLnNjaGVtYSA9IHZsU2NoZW1hO1xuXG4gICAgU2NoZW1hLmdldENoYW5uZWxTY2hlbWEgPSBmdW5jdGlvbihjaGFubmVsKSB7XG4gICAgICB2YXIgZW5jb2RpbmdDaGFubmVsUHJvcCA9IFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnMuRW5jb2RpbmcucHJvcGVydGllc1tjaGFubmVsXTtcbiAgICAgIHZhciByZWYgPSBlbmNvZGluZ0NoYW5uZWxQcm9wLiRyZWYgfHwgZW5jb2RpbmdDaGFubmVsUHJvcC5vbmVPZlswXS4kcmVmO1xuICAgICAgdmFyIGRlZiA9IHJlZi5zbGljZShyZWYubGFzdEluZGV4T2YoJy8nKSsxKTtcbiAgICAgIHJldHVybiBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zW2RlZl07XG4gICAgfTtcblxuICAgIHJldHVybiBTY2hlbWE7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3RhYnMvdGFiLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnRhYnNldCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhlYWRpbmc6ICdAJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdGFic2V0Q29udHJvbGxlcikge1xuICAgICAgICB0YWJzZXRDb250cm9sbGVyLmFkZFRhYihzY29wZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFic2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFic2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFic2V0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndGFicy90YWJzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcblxuICAgICAgLy8gSW50ZXJmYWNlIGZvciB0YWJzIHRvIHJlZ2lzdGVyIHRoZW1zZWx2ZXNcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50YWJzID0gW107XG5cbiAgICAgICAgdGhpcy5hZGRUYWIgPSBmdW5jdGlvbih0YWJTY29wZSkge1xuICAgICAgICAgIC8vIEZpcnN0IHRhYiBpcyBhbHdheXMgYXV0by1hY3RpdmF0ZWQ7IG90aGVycyBhdXRvLWRlYWN0aXZhdGVkXG4gICAgICAgICAgdGFiU2NvcGUuYWN0aXZlID0gc2VsZi50YWJzLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICBzZWxmLnRhYnMucHVzaCh0YWJTY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zaG93VGFiID0gZnVuY3Rpb24oc2VsZWN0ZWRUYWIpIHtcbiAgICAgICAgICBzZWxmLnRhYnMuZm9yRWFjaChmdW5jdGlvbih0YWIpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCB0YWIsIGRlYWN0aXZhdGUgYWxsIG90aGVyc1xuICAgICAgICAgICAgdGFiLmFjdGl2ZSA9IHRhYiA9PT0gc2VsZWN0ZWRUYWI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICAvLyBFeHBvc2UgY29udHJvbGxlciB0byB0ZW1wbGF0ZXMgYXMgXCJ0YWJzZXRcIlxuICAgICAgY29udHJvbGxlckFzOiAndGFic2V0J1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdCcsIGZ1bmN0aW9uKHZsLCB2ZywgJHRpbWVvdXQsICRxLCBEYXRhc2V0LCBDb25maWcsIGNvbnN0cywgXywgJGRvY3VtZW50LCBMb2dnZXIsIEhlYXAsICR3aW5kb3cpIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIE1BWF9DQU5WQVNfU0laRSA9IDMyNzY3LzIsIE1BWF9DQU5WQVNfQVJFQSA9IDI2ODQzNTQ1Ni80O1xuXG4gICAgdmFyIHJlbmRlclF1ZXVlID0gbmV3IEhlYXAoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIHJldHVybiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eTtcbiAgICAgIH0pLFxuICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBnZXRSZW5kZXJlcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAvLyB1c2UgY2FudmFzIGJ5IGRlZmF1bHQgYnV0IHVzZSBzdmcgaWYgdGhlIHZpc3VhbGl6YXRpb24gaXMgdG9vIGJpZ1xuICAgICAgaWYgKHdpZHRoID4gTUFYX0NBTlZBU19TSVpFIHx8IGhlaWdodCA+IE1BWF9DQU5WQVNfU0laRSB8fCB3aWR0aCpoZWlnaHQgPiBNQVhfQ0FOVkFTX0FSRUEpIHtcbiAgICAgICAgcmV0dXJuICdzdmcnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdjYW52YXMnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdC92bHBsb3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPScsXG4gICAgICAgIGlzSW5MaXN0OiAnPScsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJz0nLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgbWF4SGVpZ2h0Oic9JyxcbiAgICAgICAgbWF4V2lkdGg6ICc9JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc9JyxcbiAgICAgICAgcHJpb3JpdHk6ICc9JyxcbiAgICAgICAgcmVzY2FsZTogJz0nLFxuICAgICAgICB0aHVtYm5haWw6ICc9JyxcbiAgICAgICAgdG9vbHRpcDogJz0nLFxuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgSE9WRVJfVElNRU9VVCA9IDUwMCxcbiAgICAgICAgICBUT09MVElQX1RJTUVPVVQgPSAyNTA7XG5cbiAgICAgICAgc2NvcGUudmlzSWQgPSAoY291bnRlcisrKTtcbiAgICAgICAgc2NvcGUuaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgc2NvcGUudG9vbHRpcFByb21pc2UgPSBudWxsO1xuICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGZvcm1hdCA9IHZnLnV0aWwuZm9ybWF0Lm51bWJlcignJyk7XG5cbiAgICAgICAgc2NvcGUubW91c2VvdmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuaG92ZXJQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9WRVIsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9ICFzY29wZS50aHVtYm5haWw7XG4gICAgICAgICAgfSwgSE9WRVJfVElNRU9VVCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUubW91c2VvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuaG92ZXJGb2N1cykge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1VULCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2NvcGUuaG92ZXJQcm9taXNlKTtcbiAgICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gc2NvcGUudW5sb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiB2aWV3T25Nb3VzZU92ZXIoZXZlbnQsIGl0ZW0pIHtcbiAgICAgICAgICBpZiAoIWl0ZW0gfHwgIWl0ZW0uZGF0dW0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS50b29sdGlwUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uIGFjdGl2YXRlVG9vbHRpcCgpe1xuXG4gICAgICAgICAgICAvLyBhdm9pZCBzaG93aW5nIHRvb2x0aXAgZm9yIGZhY2V0J3MgYmFja2dyb3VuZFxuICAgICAgICAgICAgaWYgKGl0ZW0uZGF0dW0uX2ZhY2V0SUQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQLCBpdGVtLmRhdHVtKTtcblxuXG4gICAgICAgICAgICAvLyBjb252ZXJ0IGRhdGEgaW50byBhIGZvcm1hdCB0aGF0IHdlIGNhbiBlYXNpbHkgdXNlIHdpdGggbmcgdGFibGUgYW5kIG5nLXJlcGVhdFxuICAgICAgICAgICAgLy8gVE9ETzogcmV2aXNlIGlmIHRoaXMgaXMgYWN0dWFsbHkgYSBnb29kIGlkZWFcbiAgICAgICAgICAgIHNjb3BlLmRhdGEgPSBfKGl0ZW0uZGF0dW0pLm9taXQoJ19wcmV2JywgJ19pZCcpIC8vIG9taXQgdmVnYSBpbnRlcm5hbHNcbiAgICAgICAgICAgICAgLnRvUGFpcnMoKS52YWx1ZSgpXG4gICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocCkge1xuICAgICAgICAgICAgICAgIHBbMV0gPSB2Zy51dGlsLmlzTnVtYmVyKHBbMV0pID8gZm9ybWF0KHBbMV0pIDogcFsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB0b29sdGlwID0gZWxlbWVudC5maW5kKCcudmlzLXRvb2x0aXAnKSxcbiAgICAgICAgICAgICAgJGJvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KSxcbiAgICAgICAgICAgICAgd2lkdGggPSB0b29sdGlwLndpZHRoKCksXG4gICAgICAgICAgICAgIGhlaWdodD0gdG9vbHRpcC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgYWJvdmUgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyBib3R0b20gYm9yZGVyXG4gICAgICAgICAgICBpZiAoZXZlbnQucGFnZVkrMTAraGVpZ2h0IDwgJGJvZHkuaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWSsxMCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWS0xMC1oZWlnaHQpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgb24gbGVmdCBpZiBpdCdzIG5lYXIgdGhlIHNjcmVlbidzIHJpZ2h0IGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VYKzEwKyB3aWR0aCA8ICRib2R5LndpZHRoKCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCAoZXZlbnQucGFnZVgrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYLTEwLXdpZHRoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgVE9PTFRJUF9USU1FT1VUKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3V0KGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgLy9jbGVhciBwb3NpdGlvbnNcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyk7XG4gICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIG51bGwpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgbnVsbCk7XG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRvb2x0aXBQcm9taXNlKTtcbiAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcEFjdGl2ZSkge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVBfRU5ELCBpdGVtLmRhdHVtKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgIHNjb3BlLmRhdGEgPSBbXTtcbiAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWZ1NwZWMoKSB7XG4gICAgICAgICAgdmFyIGNvbmZpZ1NldCA9IHNjb3BlLmNvbmZpZ1NldCB8fCBjb25zdHMuZGVmYXVsdENvbmZpZ1NldCB8fCB7fTtcblxuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQudmxTcGVjKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHZsU3BlYyA9IF8uY2xvbmVEZWVwKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgdmcudXRpbC5leHRlbmQodmxTcGVjLmNvbmZpZywgQ29uZmlnW2NvbmZpZ1NldF0oKSk7XG5cbiAgICAgICAgICAvLyB1c2UgY2hhcnQgc3RhdHMgaWYgYXZhaWxhYmxlIChmb3IgZXhhbXBsZSBmcm9tIGJvb2ttYXJrcylcbiAgICAgICAgICB2YXIgc3RhdHMgPSBzY29wZS5jaGFydC5zdGF0cyB8fCBEYXRhc2V0LnN0YXRzO1xuXG4gICAgICAgICAgLy8gU3BlY2lhbCBSdWxlc1xuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHZsU3BlYy5lbmNvZGluZztcbiAgICAgICAgICBpZiAoZW5jb2RpbmcpIHtcbiAgICAgICAgICAgIC8vIHB1dCB4LWF4aXMgb24gdG9wIGlmIHRvbyBoaWdoLWNhcmRpbmFsaXR5XG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcueSAmJiBlbmNvZGluZy55LmZpZWxkICYmIFt2bC50eXBlLk5PTUlOQUwsIHZsLnR5cGUuT1JESU5BTF0uaW5kZXhPZihlbmNvZGluZy55LnR5cGUpID4gLTEpIHtcbiAgICAgICAgICAgICAgaWYgKGVuY29kaW5nLngpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRTdGF0cyA9IHN0YXRzW2VuY29kaW5nLnkuZmllbGRdO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZFN0YXRzICYmIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLnksIHN0YXRzKSA+IDMwKSB7XG4gICAgICAgICAgICAgICAgICAoZW5jb2RpbmcueC5heGlzID0gZW5jb2RpbmcueC5heGlzIHx8IHt9KS5vcmllbnQgPSAndG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlIHNtYWxsZXIgYmFuZCBzaXplIGlmIGhhcyBYIG9yIFkgaGFzIGNhcmRpbmFsaXR5ID4gMTAgb3IgaGFzIGEgZmFjZXRcbiAgICAgICAgICAgIGlmIChlbmNvZGluZy5yb3cgfHxcbiAgICAgICAgICAgICAgICAoZW5jb2RpbmcueSAmJiBzdGF0c1tlbmNvZGluZy55LmZpZWxkXSAmJiB2bC5maWVsZERlZi5jYXJkaW5hbGl0eShlbmNvZGluZy55LCBzdGF0cykgPiAxMCkpIHtcbiAgICAgICAgICAgICAgKGVuY29kaW5nLnkuc2NhbGUgPSBlbmNvZGluZy55LnNjYWxlIHx8IHt9KS5iYW5kU2l6ZSA9IDEyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcuY29sdW1uIHx8XG4gICAgICAgICAgICAgICAgKGVuY29kaW5nLnggJiYgc3RhdHNbZW5jb2RpbmcueC5maWVsZF0gJiYgdmwuZmllbGREZWYuY2FyZGluYWxpdHkoZW5jb2RpbmcueCwgc3RhdHMpID4gMTApKSB7XG4gICAgICAgICAgICAgIChlbmNvZGluZy54LnNjYWxlID0gZW5jb2RpbmcueC5zY2FsZSB8fCB7fSkuYmFuZFNpemUgPSAxMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVuY29kaW5nLmNvbG9yICYmIGVuY29kaW5nLmNvbG9yLnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCAmJlxuICAgICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLmNvbG9yLCBzdGF0cykgPiAxMCkge1xuICAgICAgICAgICAgICAoZW5jb2RpbmcuY29sb3Iuc2NhbGUgPSBlbmNvZGluZy5jb2xvci5zY2FsZSB8fCB7fSkucmFuZ2UgPSAnY2F0ZWdvcnkyMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHZsLmNvbXBpbGUodmxTcGVjKS5zcGVjO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmlzRWxlbWVudCgpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzY2FsZUlmRW5hYmxlKCkge1xuICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZ2V0VmlzRWxlbWVudCgpO1xuICAgICAgICAgIGlmIChzY29wZS5yZXNjYWxlKSB7XG4gICAgICAgICAgICAvLyBoYXZlIHRvIGRpZ2VzdCB0aGUgc2NvcGUgdG8gZW5zdXJlIHRoYXRcbiAgICAgICAgICAgIC8vIGVsZW1lbnQud2lkdGgoKSBpcyBib3VuZCBieSBwYXJlbnQgZWxlbWVudCFcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgdmFyIHhSYXRpbyA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgIDAuMixcbiAgICAgICAgICAgICAgICBlbGVtZW50LndpZHRoKCkgLyAgLyogd2lkdGggb2YgdmxwbG90IGJvdW5kaW5nIGJveCAqL1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoIC8qIHdpZHRoIG9mIHRoZSB2aXMgKi9cbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHhSYXRpbyA8IDEpIHtcbiAgICAgICAgICAgICAgdmlzRWxlbWVudC53aWR0aChzY29wZS53aWR0aCAqIHhSYXRpbylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5oZWlnaHQoc2NvcGUuaGVpZ2h0ICogeFJhdGlvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aXNFbGVtZW50LmNzcygndHJhbnNmb3JtJywgbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAuY3NzKCd0cmFuc2Zvcm0tb3JpZ2luJywgbnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2hvcnRoYW5kKCkge1xuICAgICAgICAgIHJldHVybiBzY29wZS5jaGFydC5zaG9ydGhhbmQgfHwgKHNjb3BlLmNoYXJ0LnZsU3BlYyA/IHZsLnNob3J0aGFuZC5zaG9ydGVuKHNjb3BlLmNoYXJ0LnZsU3BlYykgOiAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJRdWV1ZU5leHQoKSB7XG4gICAgICAgICAgLy8gcmVuZGVyIG5leHQgaXRlbSBpbiB0aGUgcXVldWVcbiAgICAgICAgICBpZiAocmVuZGVyUXVldWUuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSByZW5kZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIG5leHQucGFyc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3Igc2F5IHRoYXQgbm8gb25lIGlzIHJlbmRlcmluZ1xuICAgICAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyKHNwZWMpIHtcbiAgICAgICAgICBpZiAoIXNwZWMpIHtcbiAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gc3BlYy5oZWlnaHQ7XG4gICAgICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdjYW4gbm90IGZpbmQgdmlzIGVsZW1lbnQnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgc2hvcnRoYW5kID0gZ2V0U2hvcnRoYW5kKCk7XG5cbiAgICAgICAgICBzY29wZS5yZW5kZXJlciA9IGdldFJlbmRlcmVyKHNwZWMpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gcGFyc2VWZWdhKCkge1xuICAgICAgICAgICAgLy8gaWYgbm8gbG9uZ2VyIGEgcGFydCBvZiB0aGUgbGlzdCwgY2FuY2VsIVxuICAgICAgICAgICAgaWYgKHNjb3BlLmRlc3Ryb3llZCB8fCBzY29wZS5kaXNhYmxlZCB8fCAoc2NvcGUuaXNJbkxpc3QgJiYgc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkgJiYgIXNjb3BlLmlzSW5MaXN0KHNjb3BlLmNoYXJ0LmZpZWxkU2V0S2V5KSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbmNlbCByZW5kZXJpbmcnLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIC8vIHJlbmRlciBpZiBzdGlsbCBhIHBhcnQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIHZnLnBhcnNlLnNwZWMoc3BlYywgZnVuY3Rpb24oZXJyb3IsIGNoYXJ0KSB7XG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBlbmRQYXJzZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBjaGFydCh7ZWw6IGVsZW1lbnRbMF19KTtcblxuICAgICAgICAgICAgICAgIGlmICghY29uc3RzLnVzZVVybCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5kYXRhKHtyYXc6IERhdGFzZXQuZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHZpZXcucmVuZGVyZXIoZ2V0UmVuZGVyZXIoc3BlYy53aWR0aCwgc2NvcGUuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcblxuICAgICAgICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICAgICAgICAgIC8vIHJlYWQgIDxjYW52YXM+Lzxzdmc+4oCZcyB3aWR0aCBhbmQgaGVpZ2h0LCB3aGljaCBpcyB2ZWdhJ3Mgb3V0ZXIgd2lkdGggYW5kIGhlaWdodCB0aGF0IGluY2x1ZGVzIGF4ZXMgYW5kIGxlZ2VuZHNcbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCA9ICB2aXNFbGVtZW50LndpZHRoKCk7XG4gICAgICAgICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gdmlzRWxlbWVudC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb25zdHMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3MgPSAkd2luZG93LnZpZXdzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdID0gdmlldztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfUkVOREVSLCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICAgICAgICByZXNjYWxlSWZFbmFibGUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbmRDaGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZSBzcGVjJywgKGVuZFBhcnNlLXN0YXJ0KSwgJ2NoYXJ0aW5nJywgKGVuZENoYXJ0LWVuZFBhcnNlKSwgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5vbignbW91c2VvdmVyJywgdmlld09uTW91c2VPdmVyKTtcbiAgICAgICAgICAgICAgICAgIHZpZXcub24oJ21vdXNlb3V0Jywgdmlld09uTW91c2VPdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KHJlbmRlclF1ZXVlTmV4dCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFyZW5kZXJpbmcpIHsgLy8gaWYgbm8gaW5zdGFuY2UgaXMgYmVpbmcgcmVuZGVyIC0tIHJlbmRlcmluZyBub3dcbiAgICAgICAgICAgIHJlbmRlcmluZz10cnVlO1xuICAgICAgICAgICAgcGFyc2VWZWdhKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBxdWV1ZSBpdFxuICAgICAgICAgICAgcmVuZGVyUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgIHByaW9yaXR5OiBzY29wZS5wcmlvcml0eSB8fCAwLFxuICAgICAgICAgICAgICBwYXJzZTogcGFyc2VWZWdhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlldztcbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgICAgcmV0dXJuIF8ub21pdChzY29wZS5jaGFydC52bFNwZWMsICdkYXRhJyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzcGVjID0gc2NvcGUuY2hhcnQudmdTcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC5jbGVhblNwZWMpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICAgICBzY29wZS5jaGFydC5jbGVhblNwZWMgPSBzY29wZS5jaGFydC52bFNwZWM7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcbiAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCB2ZywgdmwsIERhdGFzZXQsIExvZ2dlciwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZ2V0RHJvcFRhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF07XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyogcGFzcyB0byB2bHBsb3QgKiovXG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICBpc0luTGlzdDogJz0nLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc9JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG1heEhlaWdodDogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG5cbiAgICAgICAgLyogdmxwbG90Z3JvdXAgc3BlY2lmaWMgKi9cblxuICAgICAgICBmaWVsZFNldDogJz0nLFxuXG4gICAgICAgIHNob3dCb29rbWFyazogJ0AnLFxuICAgICAgICBzaG93RGVidWc6ICc9JyxcbiAgICAgICAgc2hvd0V4cGFuZDogJz0nLFxuICAgICAgICBzaG93RmlsdGVyTnVsbDogJ0AnLFxuICAgICAgICBzaG93TGFiZWw6ICdAJyxcbiAgICAgICAgc2hvd0xvZzogJ0AnLFxuICAgICAgICBzaG93TWFyazogJ0AnLFxuICAgICAgICBzaG93U29ydDogJ0AnLFxuICAgICAgICBzaG93VHJhbnNwb3NlOiAnQCcsXG5cbiAgICAgICAgYWx3YXlzU2VsZWN0ZWQ6ICc9JyxcbiAgICAgICAgaXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBoaWdobGlnaHRlZDogJz0nLFxuICAgICAgICBleHBhbmRBY3Rpb246ICcmJyxcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSkge1xuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlID0gZmllbGREZWYuc2NhbGUgfHwge307XG5cbiAgICAgICAgICBzY2FsZS50eXBlID0gc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnO1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5MT0dfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICB9O1xuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgY2hhbm5lbCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZERlZi5zY2FsZSA9IGZpZWxkRGVmLnNjYWxlIHx8IHt9O1xuXG4gICAgICAgICAgcmV0dXJuIHNjYWxlLnR5cGUgPT09ICdsb2cnO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBGSUxURVJcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCB0b2dnbGVGaWx0ZXJOdWxsIHRvIGJlIGl0cyBvd24gY2xhc3NcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5OVUxMX0ZJTFRFUl9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG5cbiAgICAgICAgICBzcGVjLmNvbmZpZyA9IHNwZWMuY29uZmlnIHx8IHt9O1xuICAgICAgICAgIHNwZWMuY29uZmlnLmZpbHRlck51bGwgPSBzcGVjLmNvbmZpZy5maWx0ZXJOdWxsID09PSB0cnVlID8gdW5kZWZpbmVkIDogdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBzdGF0cykge1xuICAgICAgICAgIHZhciBmaWVsZERlZnMgPSB2bC5zcGVjLmZpZWxkRGVmcyhzcGVjKTtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIGZpZWxkRGVmcykge1xuICAgICAgICAgICAgdmFyIGZpZWxkRGVmID0gZmllbGREZWZzW2ldO1xuICAgICAgICAgICAgaWYgKF8uaW5jbHVkZXMoW3ZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXSwgZmllbGREZWYudHlwZSkgJiZcbiAgICAgICAgICAgICAgICAoZmllbGREZWYubmFtZSBpbiBzdGF0cykgJiZcbiAgICAgICAgICAgICAgICBzdGF0c1tmaWVsZERlZi5uYW1lXS5taXNzaW5nID4gMFxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgU09SVFxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZVNvcnQgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHZhciB0b2dnbGVTb3J0ID0gc2NvcGUudG9nZ2xlU29ydCA9IHt9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZXMgPSBbJ29yZGluYWwtYXNjZW5kaW5nJywgJ29yZGluYWwtZGVzY2VuZGluZycsXG4gICAgICAgICAgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnLCAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnLCAnY3VzdG9tJ107XG5cbiAgICAgICAgdG9nZ2xlU29ydC50b2dnbGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNPUlRfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIHZhciBjdXJyZW50TW9kZSA9IHRvZ2dsZVNvcnQubW9kZShzcGVjKTtcbiAgICAgICAgICB2YXIgY3VycmVudE1vZGVJbmRleCA9IHRvZ2dsZVNvcnQubW9kZXMuaW5kZXhPZihjdXJyZW50TW9kZSk7XG5cbiAgICAgICAgICB2YXIgbmV3TW9kZUluZGV4ID0gKGN1cnJlbnRNb2RlSW5kZXggKyAxKSAlICh0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgIHZhciBuZXdNb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tuZXdNb2RlSW5kZXhdO1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ3RvZ2dsZVNvcnQnLCBjdXJyZW50TW9kZSwgbmV3TW9kZSk7XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydCA9IHRvZ2dsZVNvcnQuZ2V0U29ydChuZXdNb2RlLCBzcGVjKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKiogR2V0IHNvcnQgcHJvcGVydHkgZGVmaW5pdGlvbiB0aGF0IG1hdGNoZXMgZWFjaCBtb2RlLiAqL1xuICAgICAgICB0b2dnbGVTb3J0LmdldFNvcnQgPSBmdW5jdGlvbihtb2RlLCBzcGVjKSB7XG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnZGVzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgcUVuY0RlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMucXVhbnRpdGF0aXZlXTtcblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnYXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdkZXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgc29ydCA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydDtcblxuICAgICAgICAgIGlmIChzb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnb3JkaW5hbC1hc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxIDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBzb3J0IG1hdGNoZXMgYW55IG9mIHRoZSBzb3J0IGZvciBlYWNoIG1vZGUgZXhjZXB0ICdjdXN0b20nLlxuICAgICAgICAgICAgdmFyIG1vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIHNvcnRPZk1vZGUgPSB0b2dnbGVTb3J0LmdldFNvcnQobW9kZSwgc3BlYyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRXF1YWwoc29ydCwgc29ydE9mTW9kZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHZnLnV0aWwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcblxuICAgICAgICAgIGlmICh2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdyb3cnKSB8fCB2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdjb2x1bW4nKSB8fFxuICAgICAgICAgICAgIXZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3gnKSB8fCAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneScpIHx8XG4gICAgICAgICAgICAhdmwuc3BlYy5hbHdheXNOb09jY2x1c2lvbihzcGVjLCBzdGF0cykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAoZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwpICYmXG4gICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmlzTWVhc3VyZShlbmNvZGluZy55KVxuICAgICAgICAgICAgKSA/ICd4JyA6XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLngpXG4gICAgICAgICAgICApID8gJ3knIDogZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudG9nZ2xlU29ydENsYXNzID0gZnVuY3Rpb24odmxTcGVjKSB7XG4gICAgICAgICAgaWYgKCF2bFNwZWMgfHwgIXRvZ2dsZVNvcnQuc3VwcG9ydCh2bFNwZWMsIERhdGFzZXQuc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ludmlzaWJsZSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIG9yZGluYWxDaGFubmVsID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQuY2hhbm5lbHModmxTcGVjKS5vcmRpbmFsLFxuICAgICAgICAgICAgbW9kZSA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0Lm1vZGUodmxTcGVjKTtcblxuICAgICAgICAgIHZhciBkaXJlY3Rpb25DbGFzcyA9IG9yZGluYWxDaGFubmVsID09PSAneCcgPyAnc29ydC14ICcgOiAnJztcblxuICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1hc2MnO1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtZGVzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWFzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1kZXNjJztcbiAgICAgICAgICAgIGRlZmF1bHQ6IC8vIGN1c3RvbVxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydCc7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5UUkFOU1BPU0VfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIHZsLnNwZWMudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmNoYXJ0ID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBQb3B1cCcsIGZ1bmN0aW9uIChEcm9wKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignY29tcGFjdEpTT04nLCBmdW5jdGlvbihKU09OMykge1xuICAgIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIEpTT04zLnN0cmluZ2lmeShpbnB1dCwgbnVsbCwgJyAgJywgODApO1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6ZW5jb2RlVXJpXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBlbmNvZGVVcmlcbiAqIEZpbHRlciBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2VuY29kZVVSSScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gd2luZG93LmVuY29kZVVSSShpbnB1dCk7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIGZhY2V0ZWR2aXouZmlsdGVyOnJlcG9ydFVybFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcmVwb3J0VXJsXG4gKiBGaWx0ZXIgaW4gdGhlIGZhY2V0ZWR2aXouXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigncmVwb3J0VXJsJywgZnVuY3Rpb24gKGNvbXBhY3RKU09ORmlsdGVyLCBfLCBjb25zdHMpIHtcbiAgICBmdW5jdGlvbiB2b3lhZ2VyUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzFUOVpBMTRGM21tenJIUjdKSlZVS3lQWHpyTXFGNTRDakxJT2p2MkU3WkVNL3ZpZXdmb3JtPyc7XG5cbiAgICAgIGlmIChwYXJhbXMuZmllbGRzKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihfLnZhbHVlcyhwYXJhbXMuZmllbGRzKSkpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHF1ZXJ5ICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnNwZWMpIHtcbiAgICAgICAgdmFyIHNwZWMgPSBfLm9taXQocGFyYW1zLnNwZWMsICdjb25maWcnKTtcbiAgICAgICAgc3BlYyA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTMyMzY4MDEzNj0nICsgc3BlYyArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjMikge1xuICAgICAgICB2YXIgc3BlYzIgPSBfLm9taXQocGFyYW1zLnNwZWMyLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMyID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMyKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuODUzMTM3Nzg2PScgKyBzcGVjMiArICcmJztcbiAgICAgIH1cblxuICAgICAgdmFyIHR5cGVQcm9wID0gJ2VudHJ5LjE5NDAyOTI2Nzc9JztcbiAgICAgIHN3aXRjaCAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAndmwnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdWaXN1YWxpemF0aW9uK1JlbmRlcmluZysoVmVnYWxpdGUpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ZyJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrQWxnb3JpdGhtKyhWaXNyZWMpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z2JzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrVUkrKEZhY2V0ZWRWaXopJic7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmx1aVJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xeEtzLXFHYUxaRVVmYlRtaGRtU29TMTNPS09FcHV1X05OV0U1VEFBbWxfWS92aWV3Zm9ybT8nO1xuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiBjb25zdHMuYXBwSWQgPT09ICd2b3lhZ2VyJyA/IHZveWFnZXJSZXBvcnQgOiB2bHVpUmVwb3J0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjp1bmRlcnNjb3JlMnNwYWNlXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyB1bmRlcnNjb3JlMnNwYWNlXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCd1bmRlcnNjb3JlMnNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiBpbnB1dCA/IGlucHV0LnJlcGxhY2UoL18rL2csICcgJykgOiAnJztcbiAgICB9O1xuICB9KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
