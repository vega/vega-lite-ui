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
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
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
          "description": "The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values.",
          "oneOf": [
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
          "description": "If `true`, ensures that a zero baseline value is included in the scale domain.\n\nDefault value: `true` for `x` and `y` channel if the quantitative field is not binned\n\nand no custom `domain` is provided; `false` otherwise.",
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
        "nominal"
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
        "yearmonthdate",
        "yearmonthdatehours",
        "yearmonthdatehoursminutes",
        "yearmonthdatehoursminutesseconds",
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
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
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
          "description": "A URL from which to load the data set. Use the format.type property\n\nto ensure the loaded data is correctly parsed.",
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
          "oneOf": [
            {
              "type": "string"
            },
            {
              "$ref": "#/definitions/EqualFilter"
            },
            {
              "$ref": "#/definitions/RangeFilter"
            },
            {
              "$ref": "#/definitions/InFilter"
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "$ref": "#/definitions/EqualFilter"
                  },
                  {
                    "$ref": "#/definitions/RangeFilter"
                  },
                  {
                    "$ref": "#/definitions/InFilter"
                  }
                ]
              }
            }
          ]
        },
        "filterInvalid": {
          "description": "Whether to filter invalid values (`null` and `NaN`) from the data. By default (`undefined`), only quantitative and temporal fields are filtered. If set to `true`, all data items with null values are filtered. If `false`, all data items are included.",
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
    "EqualFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered.",
          "type": "string"
        },
        "equal": {
          "description": "Value that the field should be equal to.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/DateTime",
              "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
            }
          ]
        }
      },
      "required": [
        "field",
        "equal"
      ]
    },
    "DateTime": {
      "type": "object",
      "properties": {
        "year": {
          "description": "Integer value representing the year.",
          "type": "number"
        },
        "quarter": {
          "description": "Integer value representing the quarter of the year (from 1-4).",
          "type": "number"
        },
        "month": {
          "description": "One of: (1) integer value representing the month from `1`-`12`. `1` represents January;  (2) case-insensitive month name (e.g., `\"January\"`);  (3) case-insensitive, 3-character short month name (e.g., `\"Jan\"`).",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "date": {
          "description": "Integer value representing the date from 1-31.",
          "type": "number"
        },
        "day": {
          "description": "Value representing the day of week.  This can be one of: (1) integer value -- `1` represents Monday; (2) case-insensitive day name (e.g., `\"Monday\"`);  (3) case-insensitive, 3-character short day name (e.g., `\"Mon\"`).   <br/> **Warning:** A DateTime definition object with `day`** should not be combined with `year`, `quarter`, `month`, or `date`.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "hours": {
          "description": "Integer value representing the hour of day from 0-23.",
          "type": "number"
        },
        "minutes": {
          "description": "Integer value representing minute segment of a time from 0-59.",
          "type": "number"
        },
        "seconds": {
          "description": "Integer value representing second segment of a time from 0-59.",
          "type": "number"
        },
        "milliseconds": {
          "description": "Integer value representing millisecond segment of a time.",
          "type": "number"
        }
      }
    },
    "RangeFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "range": {
          "description": "Array of inclusive minimum and maximum values\n\nfor a field value of a data item to be included in the filtered data.",
          "maxItems": 2,
          "minItems": 2,
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "range"
      ]
    },
    "InFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "in": {
          "description": "A set of values that the `field`'s value should be a member of,\n\nfor a data item included in the filtered data.",
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "number"
              },
              {
                "type": "boolean"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "in"
      ]
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
        "countTitle": {
          "description": "Default axis and legend title for count fields.",
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
          "$ref": "#/definitions/Orient",
          "description": "The orientation of a non-stacked bar, tick, area, and line charts.\n\nThe value is either horizontal (default) or vertical.\n\n- For bar, rule and tick, this determines whether the size of the bar and tick\n\nshould be applied to x or y dimension.\n\n- For area, this property determines the orient property of the Vega output.\n\n- For line, this property determines the sort order of the points in the line\n\nif `config.sortLineBy` is not specified.\n\nFor stacked charts, this is always determined by the orientation of the stack;\n\ntherefore explicitly specified value will be ignored."
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
          "description": "The symbol shape to use. One of circle (default), square, cross, diamond, triangle-up, or triangle-down, or a custom SVG path.",
          "oneOf": [
            {
              "$ref": "#/definitions/Shape"
            },
            {
              "type": "string"
            }
          ]
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
    "Orient": {
      "type": "string",
      "enum": [
        "horizontal",
        "vertical"
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
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
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
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
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
    'angular-google-analytics',
    'angular-sortable-view',
    'angular-websql',
    'ui-rangeSlider'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('vl', window.vl)
  .constant('cql', window.cql)
  .constant('vlSchema', window.vlSchema)
  .constant('vg', window.vg)
  .constant('util', window.vg.util)
  // other libraries
  .constant('jQuery', window.$)
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  .constant('ANY', '__ANY__')
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    logLevel: 'INFO',
    logPrintLevel: 'INFO',
    logToWebSql: false, // in user studies, set this to true
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
    wildcardFn: true
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("components/bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button close-action=\"Bookmarks.logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.list.length }})</h2><a class=\"bookmark-list-util\" ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a> <a class=\"bookmark-list-util\" ng-click=\"Bookmarks.export()\"><i class=\"fa fa-clipboard\"></i> Export</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.list.length > 0\" class=\"hflex flex-wrap\" sv-root=\"\" sv-part=\"Bookmarks.list\" sv-on-sort=\"Bookmarks.reorder()\"><vl-plot-group ng-repeat=\"bookmark in Bookmarks.list | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" list-title=\"\'Bookmark\'\" chart=\"bookmark.chart\" field-set=\"bookmark.chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\" show-select=\"true\" sv-element=\"\"></vl-plot-group><div sv-placeholder=\"\"></div></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.list.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("components/alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("components/channelshelf/channelshelf.html","<div class=\"shelf-group\"><div class=\"shelf\" ng-class=\"{disabled: disabled || !supportMark(channelId, mark), \'any\': isAnyChannel}\"><div class=\"shelf-label\" ng-class=\"{expanded: propsExpanded}\">{{ isAnyChannel ? \'any\' : channelId }}</div><div class=\"field-drop\" ng-model=\"pills[channelId]\" data-drop=\"!disabled && supportMark(channelId, mark)\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"encoding[channelId].field\" ng-class=\"{ expanded: funcsExpanded, any: isAnyField || isAnyFunction, \'enumerated-field\': isEnumeratedField, \'enumerated-channel\': isEnumeratedChannel, highlighted: isHighlighted(channelId) }\" field-def=\"encoding[channelId]\" show-type=\"true\" show-caret=\"true\" show-enum-spec-fn=\"true\" disable-caret=\"encoding[channelId].aggregate===\'count\' || !hasFunctions\" popup-content=\"fieldInfoPopupContent\" show-remove=\"true\" remove-action=\"removeField()\" class=\"selected draggable full-width\" data-drag=\"true\" ng-model=\"pills[channelId]\" jqyoui-draggable=\"{onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info><span class=\"placeholder\" ng-if=\"!encoding[channelId].field\">drop a field here</span></div></div><div class=\"drop-container\"><div class=\"popup-menu shelf-properties shelf-properties-{{channelId}}\"></div><div class=\"popup-menu shelf-functions shelf-functions-{{channelId}}\" ng-hide=\"!hasFunctions\"><function-select ng-if=\"!preview\" field-def=\"encoding[channelId]\" channel-id=\"channelId\" support-any=\"supportAny && consts.wildcardFn\"></function-select></div></div></div>");
$templateCache.put("components/fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCaret}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeName}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" title=\"{{ func(fieldDef) }}\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ (fieldDef.title || fieldTitle(fieldDef.field)) | underscore2space }}</span> <span class=\"wildcard-field-count\">{{ fieldCount(fieldDef.field) }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\' || fieldDef.autoCount\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span><span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"no-shrink filter\" ng-show=\"showFilter\"><a class=\"filter-field\" ng-click=\"filterAction()\"><i class=\"fa fa-filter\"></i></a></span> <span class=\"no-shrink add\" ng-show=\"showAdd\"><a class=\"add-field\" ng-click=\"addAction()\"><i class=\"fa fa-plus\"></i></a></span></span></span>");
$templateCache.put("components/filter/categoricalfilter.html","<div class=\"categorical-filter-box filter-box\"><div class=\"actions\"><div class=\"right\"><a ng-click=\"selectAll()\">All</a> <a ng-click=\"selectNone()\">None</a></div>Selected {{filter.in.length}}/{{values.length}}</div><div class=\"values\"><div ng-repeat=\"val in values\"><label><input type=\"checkbox\" ng-model=\"include[val]\" ng-change=\"filterChange()\"> {{val}}</label></div></div></div>");
$templateCache.put("components/filter/filtershelves.html","<a class=\"right\" ng-click=\"clearFilter()\"><i class=\"fa fa-eraser\"></i> Clear</a><h2>Filter</h2><div class=\"shelf-group\" ng-repeat=\"(field, filter) in filterManager.filterIndex\" ng-if=\"filter.enabled\"><div class=\"shelf filter-shelf\"><div class=\"field-drop\"><field-info ng-class=\"{expanded: funcsExpanded}\" field-def=\"{field: field}\" show-type=\"true\" show-remove=\"true\" remove-action=\"removeFilter(field)\" class=\"selected draggable full-width\"></field-info></div><categorical-filter field=\"field\" filter=\"filter\" ng-if=\"Dataset.schema.type(field) === \'nominal\' || Dataset.schema.type(field) === \'ordinal\'\"></categorical-filter><quantitative-filter field=\"field\" filter=\"filter\" ng-if=\"Dataset.schema.type(field) === \'quantitative\'\"></quantitative-filter><div field=\"field\" filter=\"filter\" ng-if=\"Dataset.schema.type(field) === \'temporal\'\">{{field}} is a temporal field and we do not support filter for temporal field yet.</div></div></div>");
$templateCache.put("components/filter/quantitativefilter.html","<div><div><span class=\"right domain-label\">{{domainMax}}</span> <span class=\"domain-label\">{{domainMin}}</span></div><div range-slider=\"\" min=\"domainMin\" \"=\"\" max=\"domainMax\" model-min=\"filter.range[0]\" model-max=\"filter.range[1]\" show-values=\"true\" attach-handle-values=\"true\"></div></div>");
$templateCache.put("components/functionselect/functionselect.html","<div class=\"function-select mb5\" ng-if=\"func.list.aboveFold.length > 1 || func.list.aboveFold[0] !== undefined\" ng-class=\"{wildcard: func.isAny}\"><div class=\"right\" ng-if=\"supportAny\"><label><input type=\"checkbox\" ng-model=\"func.isAny\" ng-change=\"isAnyChanged()\"> Wildcard</label></div><h4>Function</h4><div class=\"radios\" ng-if=\"!func.isAny || !supportAny\"><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f}}</label></div></div><div class=\"checkboxes\" ng-if=\"func.isAny && supportAny\"><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\"><input type=\"checkbox\" ng-model=\"func.checked[f]\" ng-change=\"checkChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"checkbox\" ng-model=\"func.checked[f]\" ng-change=\"checkChanged()\"> {{f}}</label></div></div><div ng-hide=\"func.isCount || func.list.belowFold.length == 0\" class=\"expand-collapse\"><a ng-click=\"showAllFunctions=!showAllFunctions\"><span ng-show=\"!showAllFunctions\">more <i class=\"fa fa-angle-down\" aria-hidden=\"true\"></i></span> <span ng-show=\"showAllFunctions\">less <i class=\"fa fa-angle-up\" aria-hidden=\"true\"></i></span></a></div></div>");
$templateCache.put("components/modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("components/propertyeditor/propertyeditor.html","<div><label class=\"prop-label\" for=\"{{ id }}\"><span class=\"name\" title=\"{{ propName }}\">{{ propName }}</span> <span ng-if=\"description\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<strong>{{ propName }}</strong><div class=\'tooltip-content\'>{{ description }}</div>\" tooltip-side=\"right\"></span></label><form class=\"inline-block\" ng-switch=\"type + (enum !== undefined ? \'list\' : \'\')\"><input id=\"{{ id }}\" ng-switch-when=\"boolean\" type=\"checkbox\" ng-model=\"group[propName]\" ng-hide=\"automodel.value\"><select id=\"{{ id }}\" ng-switch-when=\"stringlist\" ng-model=\"group[propName]\" ng-options=\"choice for choice in enum track by choice\" ng-hide=\"automodel.value\"></select><input id=\"{{ id }}\" ng-switch-when=\"integer\" ng-attr-type=\"{{ isRange ? \'range\' : \'number\'}}\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 200}\" ng-attr-min=\"{{min}}\" ng-attr-max=\"{{max}}\" ng-hide=\"automodel.value\" ng-attr-title=\"{{ isRange ? group[propName] : undefined }}\"> <input id=\"{{ id }}\" ng-attr-type=\"{{ role === \'color\' ? \'color\' : \'string\' }}\" ng-switch-when=\"string\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 500}\" ng-hide=\"automodel.value\"> <small ng-if=\"hasAuto\"><label>Auto <input ng-model=\"automodel.value\" type=\"checkbox\"></label></small></form></div>");
$templateCache.put("components/schemalist/schemalist.html","<div class=\"schema no-top-margin full-width\"><schema-list-item ng-repeat=\"fieldDef in fieldDefs | orderBy : orderBy\" field-def=\"fieldDef\" filter-manager=\"filterManager\" show-add=\"showAdd\"></schema-list-item><schema-list-item ng-if=\"showCount\" field-def=\"countFieldDef\" show-add=\"true\"></schema-list-item><div class=\"schema-list-drop\" ng-show=\"showDrop\" ng-model=\"droppedFieldDef\" data-drop=\"true\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\">Create a new wildcard.</div></div>");
$templateCache.put("components/schemalist/schemalistitem.html","<div class=\"schema-list-item\" ng-model=\"droppedFieldDef\" data-drop=\"isAnyField && fieldDef.field !== \'?\'\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"!isAnyField || fieldDef.field === \'?\' || fieldDef.field.enum.length > 0\" class=\"pill draggable full-width no-right-margin\" ng-class=\"{any: isEnumSpec(fieldDef.field)}\" ng-dblclick=\"fieldAdd(fieldDef)\" field-def=\"fieldDef\" ng-model=\"pill\" data-drag=\"true\" jqyoui-draggable=\"{placeholder: \'keep\', deepCopy: true, onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\" show-add=\"showAdd\" show-caret=\"true\" disable-caret=\"fieldDef.immutable || fieldDef.aggregate === \'count\' || allowedTypes.length<=1\" show-type=\"true\" add-action=\"fieldAdd(fieldDef)\" show-filter=\"!!filterManager\" filter-action=\"toggleFilter()\" use-title=\"true\" popup-content=\"fieldInfoPopupContent\"></field-info></div><div class=\"drop-container\"><div class=\"popup-menu schema-menu\" ng-hide=\"!allowedTypes || allowedTypes.length<=1\"><div class=\"mb5 field-type\" ng-if=\"allowedTypes.length>1 && !isAnyField\"><h4>Type</h4><label class=\"type-label\" ng-repeat=\"type in allowedTypes\"><input type=\"radio\" ng-value=\"type\" ng-model=\"fieldDef.type\"> {{type}}</label></div><div class=\"wildcard-menu\" ng-show=\"isAnyField && fieldDef.field.enum\"><div><label class=\"wildcard-title-label\"><h4>Name</h4><input type=\"text\" ng-model=\"fieldDef.title\" placeholder=\"Enter name here\"></label></div><h4>Wildcard Fields</h4><div class=\"wildcard-fields\"><field-info ng-repeat=\"field in fieldDef.field.enum\" class=\"pill list-item full-width no-right-margin\" field-def=\"field === \'*\' ? countFieldDef : Dataset.schema.fieldSchema(field)\" show-type=\"true\" show-remove=\"true\" remove-action=\"removeWildcardField($index)\"></field-info></div><a class=\"remove-action\" ng-click=\"removeWildcard()\"><i class=\"fa fa-times\"></i> Delete Wildcard</a></div></div></div>");
$templateCache.put("components/shelves/shelves.html","<div class=\"card shelves no-top-margin no-right-margin abs-100\"><a class=\"right\" ng-click=\"clear()\"><i class=\"fa fa-eraser\"></i> Clear</a><h2>Encoding</h2><div class=\"shelf-pane shelf-encoding-pane full-width\"><h3>Positional</h3><channel-shelf channel-id=\"\'x\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'y\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'column\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\" disabled=\"!spec.encoding.x.field\">></channel-shelf><channel-shelf channel-id=\"\'row\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\" disabled=\"!spec.encoding.y.field\"></channel-shelf></div><div class=\"shelf-pane shelf-marks-pane full-width\"><div class=\"right\"><select class=\"markselect\" ng-model=\"spec.mark\" ng-class=\"{auto: spec.mark === ANY}\" ng-options=\"(type === ANY ? \'auto\' : type) for type in (supportAny || supportAutoMark ? marksWithAny : marks)\" ng-change=\"markChange()\"></select></div><h3>Marks</h3><channel-shelf channel-id=\"\'size\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'color\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'shape\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'detail\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'text\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf></div><div class=\"shelf-pane shelf-any-pane full-width\" ng-if=\"supportAny && !preview\"><h3>Automatic</h3><channel-shelf ng-repeat=\"channelId in anyChannelIds\" preview=\"preview\" channel-id=\"channelId\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf></div><div class=\"shelf-pane shelf-filter-pane full-width\" ng-if=\"!preview\"><filter-shelves></filter-shelves></div></div>");
$templateCache.put("components/tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("components/tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && height > vlPlotHeight() && width > vlPlotWidth(), \'overflow-y\': (alwaysScrollable || overflow) && height > vlPlotHeight(), \'overflow-x\': (alwaysScrollable || overflow) && width > vlPlotWidth(), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseenter=\"mouseenter()\" ng-mouseleave=\"mouseleave()\"></div>");
$templateCache.put("components/vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\" ng-dblclick=\"select(chart)\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\" ng-mouseenter=\"enablePreview()\" ng-mouseleave=\"disablePreview()\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet && (fieldDef.field || fieldDef.autoCount)\" field-def=\"fieldDef\" enum-spec-index=\"chart.enumSpecIndex\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field], \'enumerated-field\': isEnumeratedField(chart, $index), \'enumerated-channel\': isEnumeratedChannel(chart, $index) }\" ng-mouseenter=\"fieldInfoMouseover(fieldDef, $index)\" ng-mouseleave=\"fieldInfoMouseout(fieldDef, $index)\"></field-info></div><div style=\"flex-grow:1\"></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" title=\"Toggle X-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" title=\"Toggle Y-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\" title=\"Sort\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" title=\"Filter Null\" ng-class=\"{active: chart.vlSpec && (chart.vlSpec.transform||{}).filterInvalid}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" title=\"Swap X/Y\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" title=\"Bookmark\" ng-click=\"toggleBookmark(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a> <a ng-if=\"showSelect\" title=\"Set encoding to this chart\" ng-click=\"select(chart)\" class=\"command select\"><i class=\"fa fa-server\"></i></a><div ng-if=\"showBookmarkAlert\" class=\"bookmark-alert\"><div>Remove bookmark?</div><small>Your notes will be lost.</small><div><a ng-click=\"removeBookmark(chart)\"><i class=\"fa fa-trash-o\"></i> remove it</a> <a ng-click=\"keepBookmark()\"><i class=\"fa fa-bookmark\"></i> keep it</a></div></div></div></div><vl-plot class=\"flex-grow-1\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" list-title=\"listTitle\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot><textarea class=\"annotation\" ng-if=\"Bookmarks.isBookmarked(chart.shorthand)\" ng-model=\"Bookmarks.dict[chart.shorthand].annotation\" ng-change=\"Bookmarks.saveAnnotations(chart.shorthand)\" placeholder=\"notes\"></textarea></div>");
$templateCache.put("components/vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");
$templateCache.put("components/vlplotgrouplist/vlplotgrouplist.html","<div class=\"vl-plot-group-list-container\"><div class=\"vis-list-header\" ng-show=\"listTitle && !hideListTitle\"><h3>{{listTitle}}</h3><span class=\"description\"></span></div><div class=\"vis-list hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in charts | limitTo: limit\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" is-in-list=\"isInList\" list-title=\"listTitle\" enable-pills-preview=\"enablePillsPreview\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug && consts.debugInList\" show-select=\"true\" show-filter-null=\"true\" show-log=\"true\" show-sort=\"true\" overflow=\"true\" tooltip=\"true\" highlighted=\"Pills.highlighted\" priority=\"priority + $index\"></vl-plot-group></div><a ng-click=\"increaseLimit()\"><div class=\"vis-list-more\" ng-show=\"limit < charts.length\">Load more...</div></a></div>");}]);
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
      return _.filter(arr, {
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

        scope.sampleData = _.filter(Dataset.datasets, {
          group: 'sample'
        });

        var datasetWatcher = scope.$watch(function() {
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

        scope.$on('$destroy', function() {
          // Clean up watchers
          datasetWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'util', 'vl', 'cql', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, util, vl, cql, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
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

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          updateFromData(dataset, dataset.values);
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
            data = util.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          updateFromData(dataset, data);
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

    function getFieldDefs(schema, order) {
      var fieldDefs = schema.fields().map(function(field) {
        return {
          field: field,
          type: schema.type(field),
          primitiveType: schema.primitiveType(field)
        };
      });

      fieldDefs = util.stablesort(fieldDefs, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      fieldDefs.push({ field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE, title: 'Count' });
      return fieldDefs;
    }

    function updateFromData(dataset, data) {
      Dataset.data = data;
      Dataset.currentDataset = dataset;

      Dataset.schema = cql.schema.Schema.build(data);
      // TODO: find all reference of Dataset.stats.sample and replace
    }

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

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'components/alertmessages/alertmessages.html',
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

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', function (Bookmarks, consts) {
    return {
      templateUrl: 'components/bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '=', // This one is really two-way binding.
        postSelectAction: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('channelShelf', ['ANY', 'Dataset', 'Pills', '_', 'Drop', 'Logger', 'vl', 'cql', 'Schema', 'consts', function(ANY, Dataset, Pills, _, Drop, Logger, vl, cql, Schema, consts) {
    return {
      templateUrl: 'components/channelshelf/channelshelf.html',
      restrict: 'E',
      replace: true,
      scope: {
        channelId: '<',
        encoding: '=',
        mark: '<',
        preview: '<',
        disabled: '<',
        supportAny: '<',
      },
      link: function(scope, element /*, attrs*/) {
        scope.Dataset = Dataset;
        scope.schema = Schema.getChannelSchema(scope.channelId);
        scope.pills = Pills.pills;
        scope.consts = consts;

        scope.isHighlighted = function (channelId) {
          var highlighted = Pills.highlighted || {};
          return highlighted[scope.encoding[channelId].field] ||
            highlighted['f' + channelId];
        };

        // These will get updated in the watcher
        scope.isAnyChannel = false;
        scope.isAnyField = false;
        scope.isAnyFunction = false;

        scope.supportMark = function(channelId, mark) {
          if (Pills.isAnyChannel(channelId)) {
            return true;
          }
          if (mark === ANY) { // TODO: support {enum: [...]}
            return true;
          }
          return vl.channel.supportMark(channelId, mark);
        };

        var propsPopup = new Drop({
          content: element.find('.shelf-properties')[0],
          target: element.find('.shelf-label')[0],
          position: 'bottom left',
          openOn: 'click'
        });

        scope.fieldInfoPopupContent =  element.find('.shelf-functions')[0];

        scope.removeField = function() {
          Pills.remove(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_REMOVED, scope.channelId, {fieldDef: scope.encoding[scope.channelId]});
        };

        scope.fieldDragStart = function() {
          Pills.dragStart(Pills.get(scope.channelId), scope.channelId);
        };

        scope.fieldDragStop = function() {
          Pills.dragStop();
        };

        /**
         * Event handler for dropping pill.
         */
        scope.fieldDropped = function() {
          var pill = Pills.get(scope.channelId);
          // validate type
          var types = Schema.schema.definitions.Type.enum;
          if (!_.includes(types, pill.type) && !cql.enumSpec.isEnumSpec(pill.type)) {
            // if existing type is not supported
            pill.type = types[0];
          }

          // TODO validate timeUnit / aggregate

          Pills.dragDrop(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_DROP, pill);
        };

        var channelIdWatcher = scope.$watch('channelId', function(channelId) {
          scope.isAnyChannel = Pills.isAnyChannel(channelId);
        }, true);

        // FIXME: remove this confusing 2-way binding logics
        // If some external action changes the fieldDef, we also need to update the pill
        var channelEncodingWatcher = scope.$watch('encoding[channelId]', function(fieldDef) {
          scope.hasFunctions = fieldDef.aggregate === 'count' ? false :
            (
              vl.util.contains(['quantitative', 'temporal'], fieldDef.type) ||
              (
                fieldDef.type && fieldDef.type.enum &&
                (vl.util.contains(fieldDef.type.enum, 'quantitative') || vl.util.contains(fieldDef.type.enum, 'temporal'))
              )
            );

          // Preview shelf should not cause side effect
          if (scope.preview) {
            scope.isEnumeratedField = Pills.isEnumeratedField(scope.channelId);
            scope.isEnumeratedChannel = Pills.isEnumeratedChannel(scope.channelId);
          } else {
            Pills.set(scope.channelId, fieldDef ? _.cloneDeep(fieldDef) : {});
            scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
            scope.isAnyFunction = cql.enumSpec.isEnumSpec(fieldDef.aggregate) ||
              cql.enumSpec.isEnumSpec(fieldDef.bin) ||
              cql.enumSpec.isEnumSpec(fieldDef.timeUnit);
          }
        }, true);


        scope.$on('$destroy', function() {
          if (propsPopup && propsPopup.destroy) {
            propsPopup.destroy();
          }

          // Clean up watchers
          channelIdWatcher();
          channelEncodingWatcher();
        });
      }
    };
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
  .directive('fieldInfo', ['ANY', 'Drop', 'vl', 'cql', function (ANY, Drop, vl, cql) {
    return {
      templateUrl: 'components/fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '<',
        filterAction: '&',
        showAdd: '<',
        showCaret: '<',
        showFilter: '=',
        showRemove: '<',
        showType: '<',
        showEnumSpecFn: '<',
        popupContent: '<',
        action: '&',
        addAction: '&',
        removeAction: '&',
        disableCaret: '<'
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;

        // Properties that are created by a watcher later
        scope.typeName = null;
        scope.icon = null;
        scope.null = null;

        scope.fieldTitle = function(field) {
          if (cql.enumSpec.isEnumSpec(field)) {
            return (field.enum || ['Wildcard'])
              .map(function(field) {
                return field === '*' ? 'COUNT' : field;
              }).join(',');
          }
          return field;
        };

        scope.fieldCount = function(field) {
          if (cql.enumSpec.isEnumSpec(field)) {
            return field.enum ? ' (' + field.enum.length + ')' : '';
          }
          return '';
        };

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        var isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.func = function(fieldDef) {
          if (fieldDef.aggregate) {
            if (!isEnumSpec(fieldDef.aggregate)) {
              return fieldDef.aggregate;
            } else if (scope.showEnumSpecFn) {
              return '?';
            }
          }
          if (fieldDef.timeUnit) {
            if (!isEnumSpec(fieldDef.timeUnit)) {
              return fieldDef.timeUnit;
            } else if (scope.showEnumSpecFn) {
              return '?';
            }
          }
          if (fieldDef.bin) {
            if (!isEnumSpec(fieldDef.bin)) {
              return 'bin';
            } else if (scope.showEnumSpecFn) {
              return '?';
            }
          }

          return fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto') || '';
        };

        var popupContentWatcher = scope.$watch('popupContent', function(popupContent) {
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

        var TYPE_NAMES = {
          nominal: 'text',
          ordinal: 'text-ordinal',
          quantitative: 'number',
          temporal: 'time',
          geographic: 'geo'
        };

        var TYPE_ICONS = {
          nominal: 'fa-font',
          ordinal: 'fa-font',
          quantitative: 'icon-hash',
          temporal: 'fa-calendar',
        };
        TYPE_ICONS[ANY] = 'fa-asterisk'; // separate line because we might change what's the string for ANY

        function getTypeDictValue(type, dict) {
          if (cql.enumSpec.isEnumSpec(type)) { // is enumSpec
            if (!type.enum) {
              return ANY; // enum spec without specific values
            }

            var val = null;
            for (var i = 0; i < type.enum.length; i++) {
              var _type = type.enum[i];
              if (val === null) {
                val = dict[_type];
              } else {
                if (val !== dict[_type]) {
                  return ANY; // If there are many conflicting types
                }
              }
            }
            return val;
          }
          return dict[type];
        }

        var fieldDefWatcher = scope.$watch('fieldDef.type', function(type) {
          scope.icon = getTypeDictValue(type, TYPE_ICONS);
          scope.typeName = getTypeDictValue(type, TYPE_NAMES);
        });

        scope.$on('$destroy', function() {
          if (funcsPopup && funcsPopup.destroy) {
            funcsPopup.destroy();
          }

          // unregister watchers
          popupContentWatcher();
          fieldDefWatcher();
        });
      }
    };
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
  .directive('categoricalFilter', ['Dataset', 'util', 'Logger', function (Dataset, util, Logger) {
    return {
      templateUrl: 'components/filter/categoricalfilter.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        scope.values = [];
        scope.include = {};

        scope.selectAll = selectAll;
        scope.selectNone = selectNone;

        scope.filterChange = function() {
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };

        function selectAll() {
          setInclude(scope.values);
          scope.filterChange();
        }

        function selectNone() {
          setInclude([]);
          scope.filterChange();
        }

        function setInclude(list) {
          scope.include = _.reduce(list, function(include, x) {
            include[x] = true;
            return include;
          }, {});
        }

        scope.$watch('field', function(field) {
          scope.values = Dataset.schema.domain({field: field});
        });

        scope.$watch('filter', function(filter) {
          setInclude(filter.in);
        });

        scope.$watch('include', function(include) {
          scope.filter.in = util.keys(include).filter(function(val) {
            return include[val];
          }).map(function(x) {
            if (+x === +x) { return +x; }
            return x;
          }).sort();
        }, true);
      }
    };
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
  .directive('filterShelves', ['FilterManager', 'Dataset', 'Logger', function (FilterManager, Dataset, Logger) {
    return {
      templateUrl: 'components/filter/filtershelves.html',
      restrict: 'E',
      replace: false,
      scope: {
      },
      link: function(scope) {
        scope.Dataset = Dataset;
        scope.filterManager = FilterManager;
        scope.clearFilter = clearFilter;
        scope.removeFilter = removeFilter;

        function clearFilter() {
          FilterManager.reset();
          Logger.logInteraction(Logger.actions.FILTER_CLEAR);
        }

        function removeFilter(field) {
          FilterManager.toggle(field);
        }
      }
    };
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
  .directive('quantitativeFilter', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'components/filter/quantitativefilter.html',
      restrict: 'E',
      replace: false,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        var domain = Dataset.schema.domain({field: scope.field});
        scope.domainMin = domain[0];
        scope.domainMax = domain[1];

        var unwatchRange = scope.$watch('filter.range', function(range, oldRange) {
          if (!oldRange || !range || (range === oldRange)) return; // skip first time
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher
          unwatchRange();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('functionSelect', ['_', 'consts', 'vl', 'cql', 'Pills', 'Logger', 'Dataset', function(_, consts, vl, cql, Pills, Logger, Dataset) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '=',
        supportAny: '<'
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.func = {
          selected: undefined,
          checked: {undefined: true},
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          },
          isAny: false,
          isTemporal: false, // for making belowFold timeUnits single-column
          isCount: false // hide "more" & "less" toggle for COUNT
        };

        // functions for T = timeUnits + undefined
        var temporalFunctions = {
          aboveFold: [
            undefined, 'year',
            'quarter', 'month',
            'date','day',
            'hours', 'minutes',
            'seconds', 'milliseconds',
            'yearmonthdate'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds',
            'secondsmilliseconds'
          ]
        };

        var timeUnitHasVariationFilter = function(timeUnit) {

          var pill =  Pills.get(scope.channelId);
          if (!pill) {
            return true;
          }
          var field = pill.field;
          // Convert 'any' channel to '?'.
          var channel = Pills.isAnyChannel(scope.channelId) ? '?' : scope.channelId;

          if (cql.enumSpec.isEnumSpec(field)) {
            // If field is ?, we can't really filter timeUnit
            return true;
          }

          return !timeUnit || // Don't filter undefined
            // Remove timeUnits that do not have variation (cardinality <= 1).
            Dataset.schema.timeUnitHasVariation({field: field, channel: channel, timeUnit: timeUnit});
        };

        // timeUnits = T functions - undefined
        var timeUnits = _.pull(_.concat(temporalFunctions.aboveFold, temporalFunctions.belowFold), undefined);

        // functions for Q = aggregates + BIN + undefined - COUNT
        var quantitativeFunctions = {
          aboveFold: [
            undefined, 'bin',
            'min', 'max',
            'mean', 'median',
            'sum'
          ],
          belowFold: [
            'valid', 'missing',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // hide COUNT for Q in the UI because we dedicate it to a special "# Count" field
        };

        // aggregates = Q Functions + COUNT - BIN - undefined
        var aggregates = _.pull(_.concat(quantitativeFunctions.aboveFold, quantitativeFunctions.belowFold, [COUNT]),
          BIN, undefined);

        function isPillQ(pill) {
          return pill && pill.type && (pill.type === vl.type.QUANTITATIVE || (pill.type.enum && vl.util.contains(pill.type.enum,vl.type.QUANTITATIVE)));
        }

        function isPillT(pill) {
          return pill && pill.type && (pill.type === vl.type.TEMPORAL || (pill.type.enum && vl.util.contains(pill.type.enum,vl.type.TEMPORAL)));
        }

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected, {
            channel: scope.channelId
          });

          var selectedFunc = scope.func.selected;

          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            isQ = isPillQ(pill),
            isT = isPillT(pill);

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          // FIXME temporal can actually have aggregation in practice too
          pill.bin = selectedFunc === BIN ? {} : undefined;
          pill.aggregate = (isQ && aggregates.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;
          pill.timeUnit = (isT && timeUnits.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        scope.isAnyChanged = function () {
          if (scope.func.isAny) {
            var checked = {};
            checked[scope.func.selected] = true;
            scope.func.checked = checked;
            scope.checkChanged();
          } else {
            scope.selectChanged();
          }
        };

        scope.checkChanged = function() {
          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            isQ = isPillQ(pill),
            isT = isPillT(pill);

          if (!pill) {
            return; // not ready
          }

          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.checked, {
            channel: scope.channelId
          });

          var fns = Object.keys(scope.func.checked)
            .filter(function(f) { return f !== 'bin'; })
            .map(function(f) { return f === 'undefined' ? undefined : f });

          // FIXME temporal / ordinal / nominal can actually have aggregation in practice too
          if (isQ) {
            pill.bin = scope.func.checked.bin ?
              (fns.length > 0 ? {enum: [false, true]} : true) :
              undefined;
            pill.aggregate = {enum: scope.func.checked.bin ? fns.concat([undefined]) : fns};
            pill.hasFn = scope.func.checked['undefined'] ? undefined : true;

            pill.timeUnit = undefined;
          } else if (isT) {
            pill.aggregate = undefined;
            pill.bin = undefined;
            pill.timeUnit = {enum: fns};
            pill.hasFn = undefined;
          }

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        // when parent objects modify the field
        var fieldDefWatcher = scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
              isQ = isPillQ(pill),
              isT = isPillT(pill);

          // for making belowFold timeUnits single-column
          scope.func.isTemporal = isT;

          // hide "more" & "less" toggles for COUNT
          scope.func.isCount = pill.field === '*';

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.list.belowFold=[];
            scope.func.selected = COUNT;
          } else {
            // TODO: check supported type based on primitive data?
            if (isT) {
              scope.func.list.aboveFold = temporalFunctions.aboveFold.filter(timeUnitHasVariationFilter);
              scope.func.list.belowFold = temporalFunctions.belowFold.filter(timeUnitHasVariationFilter);
            }
            else if (isQ) {
              scope.func.list.aboveFold = quantitativeFunctions.aboveFold;
              scope.func.list.belowFold = quantitativeFunctions.belowFold;
            }

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            scope.func.isAny = cql.enumSpec.isEnumSpec(pill.aggregate) ||
              cql.enumSpec.isEnumSpec(pill.bin) ||
              cql.enumSpec.isEnumSpec(pill.timeUnit);

            if (scope.func.isAny) {
              var checked = {};
              if (isQ) {
                var disallowUndefined = false;
                if (pill.bin) {
                  checked.bin = true;
                  if (cql.enumSpec.isEnumSpec(pill.bin)) {
                    if (pill.bin.enum) {
                      pill.bin.enum.forEach(function(bin) {
                        if (!bin) {
                          disallowUndefined = true;
                        }
                      });
                    }
                  } else {
                    disallowUndefined = true;
                  }
                }
                if (pill.aggregate) {
                  if (cql.enumSpec.isEnumSpec(pill.aggregate)) {
                    var aggregates = pill.aggregate.enum || cql.config.DEFAULT_QUERY_CONFIG.aggregates;
                    aggregates.forEach(function(aggregate) {
                      checked[aggregate] = true;
                    });
                    if (!checked['undefined']) {
                      disallowUndefined = true;
                    }
                  } else {
                    checked[pill.aggregate] = true;
                  }
                }

                if (disallowUndefined) {
                  delete checked['undefined'];
                } else {
                  checked['undefined'] = true;
                }
              } else if (isT) {
                if (pill.timeUnit) {
                  if (cql.enumSpec.isEnumSpec(pill.timeUnit)) {
                    var timeUnits = pill.timeUnit.enum || cql.config.DEFAULT_QUERY_CONFIG.aggregates;
                    timeUnits.forEach(function(timeUnit) {
                      checked[timeUnit] = true;
                    });
                  } else {
                    // Non-enum spec
                    checked[pill.timeUnit] = true;
                  }
                } else {
                  checked['undefined'] = true;
                }
              }
              scope.func.checked = checked;
            } else {
              var selected = pill.bin ? 'bin' :
                pill.aggregate || pill.timeUnit;

              if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
                scope.func.selected = selected;
              } else {
                scope.func.selected = defaultVal;
              }
            }
          }
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          fieldDefWatcher();
        });
      }
    };
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
      templateUrl: 'components/modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '<',
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
      templateUrl: 'components/modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        closeAction: '&'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeAction) {
            scope.closeAction();
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

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:propertyEditor
 * @description
 * # propertyEditor
 */
angular.module('vlui')
  .directive('propertyEditor', function () {
    return {
      templateUrl: 'components/propertyeditor/propertyeditor.html',
      restrict: 'E',
      scope: {
        id: '=',
        type: '=',
        enum: '=',
        propName: '=',
        group: '=',
        description: '=',
        default: '=',
        min: '=',
        max: '=',
        role: '=' // for example 'color'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.hasAuto = scope.default === undefined;

        //TODO(kanitw): consider renaming
        scope.automodel = { value: false };

        if (scope.hasAuto) {
          scope.automodel.value = scope.group[scope.propName] === undefined;

          // change the value to undefined if auto is true
          var autoModelWatcher = scope.$watch('automodel.value', function() {
            if (scope.automodel.value === true) {
              scope.group[scope.propName] = undefined;
            }
          });

          scope.$on('$destroy', function() {
            // Clean up watcher
            autoModelWatcher();
          });

        }

        scope.isRange = scope.max !== undefined && scope.min !== undefined;
      }
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('schemaList', ['vl', 'cql', 'Logger', 'Pills', function(vl, cql, Logger, Pills) {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '<',
        fieldDefs: '<',
        filterManager: '=',
        showAdd: '<',
        showCount: '<',
        showDrop: '<'
      },
      replace: true,
      link: function(scope) {
        scope.Pills = Pills;
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.droppedFieldDef = {};
        scope.countFieldDef = Pills.countFieldDef;

        scope.fieldDropped = function() {
          Logger.logInteraction(Logger.actions.ADD_WILDCARD, scope.droppedFieldDef);
          Pills.addWildcard(scope.droppedFieldDef);
          scope.droppedFieldDef = {};
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name polestar.directive:schemaListItem
 * @description
 * # schemaListItem
 */
angular.module('vlui')
  .directive('schemaListItem', ['Dataset', 'Drop', 'Logger', 'Pills', 'cql', 'vl', function (Dataset, Drop, Logger, Pills, cql, vl) {
    return {
      templateUrl: 'components/schemalist/schemalistitem.html',
      restrict: 'E',
      replace: false,
      scope: {
        fieldDef: '=', // Two-way
        showAdd:  '<',
        filterManager: '='
      },
      link: function postLink(scope, element) {
        scope.Dataset = Dataset;
        scope.countFieldDef = Pills.countFieldDef;

        scope.isAnyField = false;
        scope.droppedFieldDef = null;
        scope.fieldInfoPopupContent =  element.find('.schema-menu')[0];

        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.fieldAdd = function(fieldDef) {
          Pills.add(fieldDef);
        };

        scope.toggleFilter = function() {
          if (!scope.filterManager) return;
          scope.filterManager.toggle(scope.fieldDef.field);
        };

        scope.fieldDragStart = function() {
          var fieldDef = scope.fieldDef;

          scope.pill = {
            field: fieldDef.field,
            title: fieldDef.title,
            type: fieldDef.type,
            aggregate: fieldDef.aggregate
          };
          Pills.dragStart(scope.pill, null);
        };

        scope.fieldDragStop = Pills.dragStop;

        scope.fieldDropped = function() {
          Pills.addWildcardField(scope.fieldDef, scope.droppedFieldDef);
          Logger.logInteraction(Logger.actions.ADD_WILDCARD_FIELD, scope.fieldDef, {
            addedField: scope.droppedFieldDef
          });
          scope.droppedFieldDef = null;
        };

        scope.removeWildcardField = function(index) {
          var field = scope.fieldDef.field;
          Logger.logInteraction(Logger.actions.REMOVE_WILDCARD_FIELD, scope.fieldDef, {
            removedField: field.enum[index] === '*' ? 'COUNT' : field.enum[index]
          });
          Pills.removeWildcardField(scope.fieldDef, index);
        };

        scope.removeWildcard = function() {
          Logger.logInteraction(Logger.actions.REMOVE_WILDCARD, scope.fieldDef);
          Pills.removeWildcard(scope.fieldDef);
        };

        // TODO(https://github.com/vega/vega-lite-ui/issues/187):
        // consider if we can use validator / cql instead
        var allowedCasting = {
          integer: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          number: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          date: [vl.TEMPORAL],
          string: [vl.type.NOMINAL],
          boolean: [vl.type.NOMINAL],
          all: [vl.type.QUANTITATIVE, vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL]
        };

        var unwatchFieldDef = scope.$watch('fieldDef', function(fieldDef){
          if (cql.enumSpec.isEnumSpec(fieldDef.field)) {
            scope.allowedTypes = allowedCasting.all;
          } else {
            scope.allowedTypes = allowedCasting[fieldDef.primitiveType];
          }

          scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
        });

        scope.$on('$destroy', function() {
          scope.fieldAdd = null;
          scope.fieldDragStop = null;
          scope.isEnumSpec = null;

          unwatchFieldDef();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('shelves', function() {

    return {
      templateUrl: 'components/shelves/shelves.html',
      restrict: 'E',
      scope: {
        spec: '=',
        preview: '<',
        supportAny: '<',
        supportAutoMark: '<',
        filterManager: '='
      },
      replace: true,
      controller: ['$scope', 'ANY', 'util', 'vl', 'Config', 'Dataset', 'Logger', 'Pills', function($scope, ANY, util, vl, Config, Dataset, Logger, Pills) {
        $scope.ANY = ANY;
        $scope.anyChannelIds = [];
        $scope.Dataset = Dataset;

        $scope.marks = ['point', 'tick', 'bar', 'line', 'area', 'text'];
        $scope.marksWithAny = [ANY].concat($scope.marks);

        $scope.markChange = function() {
          Logger.logInteraction(Logger.actions.MARK_CHANGE, $scope.spec.mark);
        };

        $scope.transpose = function(){
          vl.spec.transpose($scope.spec);
        };

        $scope.clear = function(){
          Logger.logInteraction(Logger.actions.SPEC_CLEAN, $scope.spec);
          Pills.reset();
        };

        var specWatcher = $scope.$watch('spec', function(spec) {
          // populate anyChannelIds so we show all or them
          if ($scope.supportAny) {
            $scope.anyChannelIds = util.keys(spec.encoding).reduce(function(anyChannelIds, channelId) {
              if (Pills.isAnyChannel(channelId)) {
                anyChannelIds.push(channelId);
              }
              return anyChannelIds;
            }, []);
          }
          // Only call Pills.update, which will trigger Spec.spec to update if it's not a preview.
          if (!$scope.preview) {
            var Spec = Pills.update(spec);
            var logData = null;
            if (Spec) {
              if (Spec.charts) {
                logData = {specific: false, numCharts: Spec.charts.length};
              } else if (Spec.chart) {
                logData = {specific: true};
              } else {
                logData = {specific: false, numCharts: 0};
              }
            }
            Logger.logInteraction(Logger.actions.SPEC_CHANGE, spec, logData);
          }
        }, true); //, true /* watch equality rather than reference */);


        $scope.$on('$destroy', function() {
          // Clean up watcher
          specWatcher();
        });
      }]
    };
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
      templateUrl: 'components/tabs/tab.html',
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
      templateUrl: 'components/tabs/tabset.html',
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
  .directive('vlPlot', ['vl', 'vg', 'cql', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(vl, vg, cql, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return a.priority - b.priority;
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
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '<',
        /** A function that returns if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<'
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500;
        var view;
        var tooltip;
        var TOOLTIP_DELAY = 200;

        scope.vlPlotHeight = function() {
          return element.height();
        };

        scope.vlPlotWidth = function() {
          return element.width();
        };

        function destroyView() {
          if (view) {
            tooltip.destroy(); // destroy tooltip (promise and event listners)
            view.off('mouseover');
            view.off('mouseout');
            view.destroy();
            view = null;

            var shorthand = getShorthand();
            if (consts.debug && $window.views) {
              delete $window.views[shorthand];
            }
          }
        }

        scope.visId = (counter++);

        var hoverPromise = null;
        var renderQueueNextPromise = null;

        scope.hoverFocus = false;
        scope.destroyed = false;

        scope.mouseenter = function() {
          hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, scope.chart.shorthand,{
              list: scope.listTitle
            });
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseleave = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, scope.chart.shorthand, {
              list: scope.listTitle
            });
          }

          $timeout.cancel(hoverPromise);
          hoverPromise = null;

          scope.hoverFocus = scope.unlocked = false;
        };

        function onTooltipAppear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function onTooltipDisappear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());
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
          return scope.chart.shorthand || (scope.chart.vlSpec ? cql.query.shorthand.vlSpec(scope.chart.vlSpec) : '');
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
              destroyView();
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
                return;
              }
              try {
                var endParse = new Date().getTime();
                destroyView();
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.update();

                // read width / height from layout
                var layout = view.data('layout').values()[0];
                var renderer = getRenderer(layout.width, layout.height);
                if (renderer === 'svg') {
                  view.renderer(renderer);
                }

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, scope.chart.shorthand, {
                  list: scope.listTitle
                });
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  // use vega-tooltip
                  tooltip = vl.tooltip(view, scope.chart.vlSpec, {
                    onAppear: onTooltipAppear,
                    onDisappear: onTooltipDisappear,
                    delay: TOOLTIP_DELAY
                  });
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
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

        var specWatcher = scope.$watch(function() {
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
            destroyView();
          }

          if (hoverPromise) {
            $timeout.cancel(hoverPromise);
            hoverPromise = null;
          }

          // if (renderQueueNextPromise) {
          //   $timeout.cancel(renderQueueNextPromise);
          //   renderQueueNextPromise = null;
          // }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.

          // Clean up watcher
          specWatcher();
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
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vg', 'vl', 'Dataset', 'Logger', '_', 'Pills', 'Chart', '$timeout', 'Modals', function (Bookmarks, consts, vg, vl, Dataset, Logger, _, Pills, Chart, $timeout, Modals) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgroup.html',
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
        disabled: '<',
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        enablePillsPreview: '<',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<',

        /* vlplotgroup specific */

        /** Set of fieldDefs for showing field info.  For Voyager2, this might be just a subset of fields that are ambiguous. */
        fieldSet: '<',

        showBookmark: '<',
        showDebug: '<',
        showExpand: '<',
        showFilterNull: '<',
        showLabel: '<',
        showLog: '<',
        showSelect: '<',
        showSort: '<',
        showTranspose: '<',

        /** Whether the log / transpose sort cause side effect to the shelf  */
        toggleShelf: '<',

        alwaysSelected: '<',
        isSelected: '<',
        highlighted: '<',
        expandAction: '&',
        selectAction: '&'
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;


        // bookmark alert
        scope.showBookmarkAlert = false;
        scope.toggleBookmark = function(chart) {
          if (Bookmarks.isBookmarked(chart.shorthand)) {
            scope.showBookmarkAlert = !scope.showBookmarkAlert; // toggle alert
          }
          else {
            Bookmarks.add(chart, scope.listTitle);
          }
        };

        var fieldHoverPromise = null;
        var previewPromise = null;

        scope.enablePreview = function() {
          previewPromise = $timeout(function() {
            if (scope.enablePillsPreview) {
              Pills.preview(true, scope.chart, scope.listTitle);
            }
          }, 500);

        };

        scope.disablePreview = function() {
          if (previewPromise) {
            $timeout.cancel(previewPromise);
          }
          previewPromise = null;

          if (scope.enablePillsPreview) {
            Pills.preview(false, scope.chart, scope.listTitle);
          }
        };

        scope.fieldInfoMouseover = function(fieldDef, index) {
          fieldHoverPromise = $timeout(function() {
            (scope.highlighted||{})[fieldDef.field] = true;

            // Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                (scope.highlighted||{})[fieldEnumSpecName] = true;
              }
            }

            Logger.logInteraction(Logger.actions.FIELDDEF_HIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });
          }, 500);
        };

        scope.fieldInfoMouseout = function(fieldDef, index) {
          if (fieldHoverPromise) {
            // if we unhover within
            $timeout.cancel(fieldHoverPromise);
          }
          fieldHoverPromise = null;

          if ((scope.highlighted||{})[fieldDef.field]) {
            // disable preview if it's enabled
            Logger.logInteraction(Logger.actions.FIELDDEF_UNHIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });

            (scope.highlighted||{})[fieldDef.field] = false;

            // Unlink Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                delete (scope.highlighted||{})[fieldEnumSpecName];
              }
            }
          }
        };

        scope.isEnumeratedField = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].field;
            }
          }
          return false;
        };

        scope.isEnumeratedChannel = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].channel;
            }
          }
          return false;
        };

        scope.select = function(chart) {
          Logger.logInteraction(Logger.actions.SPEC_SELECT, chart.shorthand, {
            list: scope.listTitle
          });
          Pills.select(chart.vlSpec);
          if (scope.$parent.postSelectAction) {
            scope.$parent.postSelectAction();
          }
          Modals.close('bookmark-list'); // HACK: this line is only necessary when this function is called from bookmark list
        };

        scope.removeBookmark = function(chart) {
          Bookmarks.remove(chart);
          scope.showBookmarkAlert = false;
        };

        scope.keepBookmark = function() {
          scope.showBookmarkAlert = false;
        };

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

          var fieldDef = Pills.get(channel),
            scale = fieldDef.scale = fieldDef.scale || {};

          if (scope.toggleShelf) {
            Pills.rescale(channel, scale.type === 'log' ? 'linear' : 'log');
          } else {
            scale.type = scale.type === 'log' ? 'linear' : 'log';
          }

          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });

          Pills.set(channel, fieldDef, true);
        };

        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale;

          return scale && scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });

          if (scope.toggleShelf) {
            Pills.toggleFilterInvalid();
          } else {
            spec.transform = spec.transform || {};
            spec.transform.filterInvalid = spec.transform.filterInvalid === true ? undefined : true;
          }
        };

        scope.toggleFilterNull.support = function(spec) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) && Dataset.schema.stats(fieldDef).missing > 0) {
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

          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand, {
            currentMode: currentMode,
            newMode: newMode,
            list: scope.listTitle
          });

          var channels = toggleSort.channels(spec);

          if (scope.toggleShelf) {
            Pills.sort(channels.ordinal, toggleSort.getSort(newMode, spec));
          } else {
            spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
          }
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

        toggleSort.support = function(spec) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.encoding.isAggregate(spec.encoding)) { // FIXME replace this proper alwaysNoOcclusion method
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
          if (!vlSpec || !toggleSort.support(vlSpec)) {
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
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
          if (scope.toggleShelf) {
            Pills.transpose();
          } else {
            Chart.transpose(scope.chart.vlSpec);
          }
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
      templateUrl: 'components/vlplotgroup/vlplotgrouppopup.html',
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
  .directive('vlPlotGroupList', ['vl', 'cql', 'jQuery', 'consts', '_', 'Logger', 'Pills', 'Chart', function (vl, cql, jQuery, consts, _, Logger, Pills, Chart) {
    return {
      templateUrl: 'components/vlplotgrouplist/vlplotgrouplist.html',
      restrict: 'E',
      replace: true,
      scope: {
        /** An instance of specQueryModelGroup */
        enablePillsPreview: '<',
        initialLimit: '<',
        listTitle: '<',
        hideListTitle: '<',
        charts: '<',
        priority: '<',
        showMore: '<',
        postSelectAction: '&'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.consts = consts;
        scope.limit = scope.initialLimit || 3;

        // Functions
        scope.getChart = Chart.getChart;
        scope.increaseLimit = increaseLimit;
        scope.isInlist = isInList;
        scope.Pills = Pills;

        // element.bind('scroll', function(){
        //    if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight){
        //     if (scope.limit < scope.modelGroup.charts.length) {
        //       scope.increaseLimit();
        //     }
        //    }
        // });

        function increaseLimit() {
          scope.limit += 5;
          Logger.logInteraction(Logger.actions.LOAD_MORE, scope.limit, {
            list: scope.listTitle
          });
        }

        /** return if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        function isInList(chart) {
          for (var i = 0; i < scope.charts.length; i++) {
            if(chart.shorthand === scope.charts[i].shorthand) {
              return true;
            }
          }
          return false;
        }
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
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = [];
      this.dict = {};
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = _.throttle(function(shorthand) {
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = this.dict[shorthand].annotation;
      this.save();
    }, 1000, {trailing: true});

    // export all bookmarks and annotations
    proto.export = function() {
      var dictionary = this.dict;

      // prepare export data
      var exportSpecs = [];
      _.forEach(this.list, function(bookmark) {
        var spec = bookmark.chart.vlSpec;
        spec.description = dictionary[bookmark.shorthand].annotation;
        exportSpecs.push(spec);
      });

      // write export data in a new tab
      var exportWindow = window.open();
      exportWindow.document.open();
      exportWindow.document.write('<html><body><pre>' + JSON.stringify(exportSpecs, null, 2) + '</pre></body></html>');
      exportWindow.document.close();
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];

      // populate this.dict
      var dictionary = this.dict;
      _.forEach(this.list, function(bookmark) {
        dictionary[bookmark.shorthand] = _.cloneDeep(bookmark.chart);
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.dict = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.add = function(chart, listTitle) {
      var shorthand = chart.shorthand;
      chart.timeAdded = (new Date().getTime());

      // FIXME: this is not always a good idea
      chart.schema = Dataset.schema;

      this.dict[chart.shorthand] = _.cloneDeep(chart);

      this.list.push({
        shorthand: shorthand,
        list: listTitle,
        chart: _.cloneDeep(chart)
      });

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand, {
        list: listTitle
      });
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      var removed;
      if (index >= 0) {
        removed = this.list.splice(index, 1)[0];
      }

      // remove bookmark from this.dict
      delete this.dict[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand, {
        list: (removed || {}).list
      });
    };

    proto.reorder = function() {
      this.save();
    };

    proto.isBookmarked = function(shorthand) {
      return this.dict.hasOwnProperty(shorthand);
    };

    proto.logBookmarksClosed = function() {
      Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Chart', ['cql', '_', function (cql, _) {
    var Chart = {
      getChart: getChart,
      transpose: transpose
    };

    /**
     *
     * @param {SpecQueryModelGroup | SpecQueryModel} item
     */
    function getChart(item) {
      if (!item) {
        return {
          /** @type {Object} concise spec generated */
          vlSpec: null,
          fieldSet: null,

          /** @type {String} generated vl shorthand */
          shorthand: null,
          enumSpecIndex: null
        };
      }

      var specM = item instanceof cql.model.SpecQueryModelGroup ?
        item.getTopSpecQueryModel():
        item;
      return {
        enumSpecIndex: specM.enumSpecIndex,
        fieldSet: specM.specQuery.encodings,
        vlSpec: specM.toSpec(),
        shorthand: specM.toShorthand()
      };
    }

    function transpose(spec) {
      var encoding = _.clone(spec.encoding);
      var oldXEnc = encoding.x;
      var oldYEnc = encoding.y;
      encoding.y = oldXEnc;
      encoding.x = oldYEnc;

      var oldRowEnc = encoding.row;
      var oldColEnc = encoding.column;
      encoding.row = oldColEnc;
      encoding.column = oldRowEnc;

      spec.encoding = encoding;
    }

    return Chart;
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
          width: 300,
          height: 300
        },
        facet: {
          cell: {
            width: 150,
            height: 150
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

angular.module('vlui')
  .service('FilterManager', ['_', 'vl', 'Dataset', 'Logger', function (_, vl, Dataset, Logger) {
    var self = this;

    /** local object for this object */
    self.filterIndex = {};

    this.toggle = function(field) {
      if (!self.filterIndex[field]) {
        self.filterIndex[field] = initFilter(field);
      } else {
        self.filterIndex[field].enabled = !self.filterIndex[field].enabled;
      }
      Logger.logInteraction(
        self.filterIndex[field].enabled ? Logger.actions.FILTER_ENABLED : Logger.actions.FILTER_DISABLED,
        field,
        self.filterIndex[field]
      );
    };

    this.reset = function(oldFilter, hard) {
      if (hard) {
        self.filterIndex = {};
      } else {
        _.forEach(self.filterIndex, function(value, field) {
          delete self.filterIndex[field];
        });
      }

      if (oldFilter) {
        oldFilter.forEach(function(filter) {
          self.filterIndex[filter.field] = vl.util.extend({enabled: true}, filter);
        });
      }

      return self.filterIndex;
    };

    this.getVlFilter = function() {
      var vlFilter = _.reduce(self.filterIndex, function (filters, filter) {
        var field = filter.field;
        var timeUnit = filter.timeUnit;

        if (filter.in) {
          if ( filter.in.length === 0 ||
               filter.in.length === Dataset.schema.cardinality({field: field}) ) {
            return filters;
          }
        } else if (filter.range) {
          var domain = Dataset.schema.domain({
            field: field,
            timeUnit: timeUnit
          });

          if (filter.range[0] === domain[0] && filter.range[1] === domain[1]) {
            return filters;
          }
        }

        if (filter.enabled) {
          filters.push(_.omit(filter, 'enabled'));
        }
        return filters;
      }, []);

      return vlFilter.length ? vlFilter : undefined;
    };

    function initFilter(field) {
      var type = Dataset.schema.type(field);

      switch (type) {
        case vl.type.NOMINAL:
        case vl.type.ORDINAL:
          return {
            enabled: true,
            field: field,
            in: Dataset.schema.domain({field: field})
          };
        case vl.type.QUANTITATIVE:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
        case vl.type.TEMPORAL:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
      }
    }
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
  .service('Logger', ['$location', '$window', '$webSql', '_', 'consts', 'Analytics', 'Papa', 'Blob', 'URL', function ($location, $window, $webSql, _, consts, Analytics, Papa, Blob, URL) {

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
      ADD_FIELD: {category: 'FIELDS', id: 'ADD_FIELD', level: service.levels.INFO},

      // Field Info
      FIELDDEF_HIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_HIGHLIGHTED', level: service.levels.INFO},
      FIELDDEF_UNHIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_UNHIGHLIGHTED', level: service.levels.INFO},

      // WILDCARD
      ADD_WILDCARD: {category: 'WILDCARD', id: 'ADD_WILDCARD', level: service.levels.INFO},
      ADD_WILDCARD_FIELD: {category: 'WILDCARD', id: 'ADD_WILDCARD_FIELD', level: service.levels.INFO},
      REMOVE_WILDCARD_FIELD: {category: 'WILDCARD', id: 'REMOVE_WILDCARD_FIELD', level: service.levels.INFO},
      REMOVE_WILDCARD: {category: 'WILDCARD', id: 'REMOVE_WILDCARD', level: service.levels.INFO},

      // POLESTAR
      SPEC_CLEAN: {category:'POLESTAR', id: 'SPEC_CLEAN', level: service.levels.INFO},
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.INFO},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.INFO},
      FIELD_REMOVED: {category: 'POLESTAR', id: 'FIELD_REMOVED', level: service.levels.INFO},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.INFO},

      // Filter
      FILTER_ENABLED: {category:'FILTER', id: 'FILTER_ENABLED', level: service.levels.INFO},
      FILTER_DISABLED: {category:'FILTER', id: 'FILTER_DISABLED', level: service.levels.INFO},
      FILTER_CHANGE: {category:'FILTER', id: 'FILTER_CHANGE', level: service.levels.INFO},
      FILTER_CLEAR: {category:'FILTER', id: 'FILTER_CLEAR', level: service.levels.INFO},

      // Voyager 2
      SPEC_SELECT: {category:'VOYAGER2', id: 'SPEC_SELECT', level: service.levels.INFO},

      // Alternatives
      SET_ALTERNATIVES_TYPE: {category:'ALTERNATIVES', id: 'SET_ALTERNATIVES_TYPE', level: service.levels.INFO},
      TOGGLE_SHOW_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_SHOW_ALTERNATIVES', level: service.levels.INFO},
      TOGGLE_HIDE_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_HIDE_ALTERNATIVES', level: service.levels.INFO},

      // Preview
      SPEC_PREVIEW_ENABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_ENABLED', level: service.levels.INFO},
      SPEC_PREVIEW_DISABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_DISABLED', level: service.levels.INFO}
    };

    // create noop service if websql is not supported
    if ($window.openDatabase === undefined) {
      console.warn('No websql support and thus no logging.');
      service.logInteraction = function() {};
      return service;
    }

    // get user id once in the beginning
    var userid = service.userid = $location.search().userid;

    service.db = $webSql.openDatabase('logs', '1.0', 'Logs', 2 * 1024 * 1024);

    service.tableName = 'Logs_' + consts.appId;

    // (zening) TODO: check if the table is correct, do we really need time? will time be automatically added?
    service.createTableIfNotExists = function() {
      service.db.createTable(service.tableName, {
        'userid': {
          'type': 'INTEGER',
          'null': 'NOT NULL'
        },
        'time': {
          'type': 'TIMESTAMP',
          'null': 'NOT NULL'
        },
        'actionCategory': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'actionId': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'label': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'data': {
          'type': 'TEXT'
        }
      });
    };

    service.clear = function() {
      var r = $window.confirm('Really clear the logs?');
      if (r === true) {
        service.db.dropTable(service.tableName);
        service.createTableIfNotExists();
      }
    };

    service.export = function() {
      service.db.selectAll(service.tableName).then(function(results) {
        if (results.rows.length === 0) {
          console.warn('No logs');
          return;
        }

        var rows = [];

        for(var i=0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }

        var csv = Papa.unparse(rows);

        var csvData = new Blob([csv], { type: 'text/csv' });
        var csvUrl = URL.createObjectURL(csvData);

        var element = angular.element('<a/>');
        element.attr({
          href: csvUrl,
          target: '_blank',
          download: service.tableName + '_' + userid + '_' + new Date().toISOString() + '.csv'
        })[0].click();
      });
    };


    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels[consts.logLevel || 'INFO'].rank) {
        Analytics.trackEvent(action.category, action.id, label, value);

        if (consts.logToWebSql) {
          var row = {
            userid: userid,
            time: new Date().toISOString(),
            actionCategory: action.category,
            actionId: action.id,
            label: _.isObject(label) ? JSON.stringify(label) : label,
            data: data ? JSON.stringify(data) : undefined
          };
          service.db.insert(service.tableName, row);
        }

        if (action.level.rank >= service.levels[consts.logPrintLevel || 'INFO'].rank) {
          console.log('[Logging] ', action.id, label, data);
        }
      }
    };

    service.createTableIfNotExists();
    console.log('app:', consts.appId, 'started');
    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Pills', ['ANY', 'consts', 'util', 'vl', 'cql', function (ANY, consts, util, vl, cql) {
    var Pills = {
      // Functions
      isAnyChannel: isAnyChannel,
      getNextAnyChannelId: getNextAnyChannelId,
      getEmptyAnyChannelId: getEmptyAnyChannelId,
      isEnumeratedChannel: isEnumeratedChannel,
      isEnumeratedField: isEnumeratedField,

      get: get,
      // Event
      dragDrop: dragDrop,
      dragStart: dragStart,
      dragStop: dragStop,
      // Event, with handler in the listener

      /** Set a fieldDef for a channel */
      set: set,

      /** Remove a fieldDef from a channel */
      remove: remove,

      countFieldDef: {field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE},

      // Data
      // TODO: split between encoding related and non-encoding related
      pills: {},
      highlighted: {},
      /** pill being dragged */
      dragging: null,
      isDraggingWildcard: null,
      /** channelId that's the pill is being dragged from */
      cidDragFrom: null,
      /** Listener  */
      listener: null
    };

    // Add listener type that Pills just pass arguments to its listener
    // FIXME: properly implement listener pattern
    [
      'add', 'parse', 'select', 'preview', 'update', 'reset',
      'rescale', 'sort', 'toggleFilterInvalid', 'transpose',
      'addWildcardField', 'addWildcard', 'removeWildcardField', 'removeWildcard'
    ].forEach(function(listenerType) {
      Pills[listenerType] = function() {
        if (Pills.listener && Pills.listener[listenerType]) {
          return Pills.listener[listenerType].apply(null, arguments);
        }
      };
    });

    /**
     * Returns whether the given channel id is an "any" channel
     *
     * @param {any} channelId
     */
    function isAnyChannel(channelId) {
      return channelId && channelId.indexOf(ANY) === 0; // prefix by ANY
    }

    function getEmptyAnyChannelId() {
      var anyChannels = util.keys(Pills.pills).filter(function(channelId) {
        return channelId.indexOf(ANY) === 0;
      });
      for (var i=0 ; i < anyChannels.length; i++) {
        var channelId = anyChannels[i];
        if (!Pills.pills[channelId].field) {
          return channelId;
        }
      }
      throw new Error('No empty any channel available!');
    }

    function getNextAnyChannelId() {
      var i = 0;
      while (Pills.pills[ANY + i]) {
        i++;
      }

      if (!consts.maxAnyShelf || i >= consts.maxAnyShelf) {
        return null;
      }

      return ANY + i;
    }

    /**
     * Set a fieldDef of a pill of a given channelId
     * @param channelId channel id of the pill to be updated
     * @param fieldDef fieldDef to to be updated
     * @param update whether to propagate change to the channel update listener
     */
    function set(channelId, fieldDef, update) {
      Pills.pills[channelId] = fieldDef;

      if (update && Pills.listener) {
        Pills.listener.set(channelId, fieldDef);
      }
    }

    /**
     * Get a fieldDef of a pill of a given channelId
     */
    function get(channelId) {
      return Pills.pills[channelId];
    }

    function isEnumeratedChannel(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedChannel) {
        return Pills.listener.isEnumeratedChannel(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function isEnumeratedField(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedField) {
        return Pills.listener.isEnumeratedField(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function remove(channelId) {
      delete Pills.pills[channelId];
      if (Pills.listener) {
        Pills.listener.remove(channelId);
      }
    }

    /**
     * @param {any} pill pill being dragged
     * @param {any} cidDragFrom channel id that the pill is dragged from
     */
    function dragStart(pill, cidDragFrom) {
      Pills.dragging = pill;
      Pills.isDraggingWildcard = cql.enumSpec.isEnumSpec(pill.field);
      Pills.cidDragFrom = cidDragFrom;
    }

    /** Stop pill dragging */
    function dragStop() {
      Pills.dragging = null;
    }

    /**
     * When a pill is dropped
     * @param cidDragTo  channelId that's the pill is being dragged to
     */
    function dragDrop(cidDragTo) {
      if (Pills.listener) {
        Pills.listener.dragDrop(cidDragTo, Pills.cidDragFrom);
      }
    }

    return Pills;
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', ['vg', 'vl', 'vlSchema', function(vg, vl, vlSchema) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var def = null;
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      // for detail, just get the flat version
      var ref = encodingChannelProp ?
        (encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref) :
        'FieldDef'; // just use the generic version for ANY channel
      def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  }]);
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ2bC1zY2hlbWEuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuanMiLCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuanMiLCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuanMiLCJkYXRhc2V0L2RhdGFzZXQuc2VydmljZS5qcyIsImRhdGFzZXQvZGF0YXNldG1vZGFsLmpzIiwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuanMiLCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5qcyIsImRhdGFzZXQvcGFzdGVkYXRhc2V0LmpzIiwiZGF0YXNldC9zYW1wbGVkYXRhLmpzIiwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuanMiLCJjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuanMiLCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuanMiLCJjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uanMiLCJjb21wb25lbnRzL2ZpbHRlci9jYXRlZ29yaWNhbGZpbHRlci5qcyIsImNvbXBvbmVudHMvZmlsdGVyL2ZpbHRlcnNoZWx2ZXMuanMiLCJjb21wb25lbnRzL2ZpbHRlci9xdWFudGl0YXRpdmVmaWx0ZXIuanMiLCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0LmpzIiwiY29tcG9uZW50cy9tb2RhbC9tb2RhbC5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxzLnNlcnZpY2UuanMiLCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmpzIiwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuanMiLCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uanMiLCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5qcyIsImNvbXBvbmVudHMvdGFicy90YWIuanMiLCJjb21wb25lbnRzL3RhYnMvdGFic2V0LmpzIiwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90LmpzIiwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5qcyIsImZpbHRlcnMvY29tcGFjdGpzb24vY29tcGFjdGpzb24uZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvcmVwb3J0dXJsL3JlcG9ydHVybC5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiLCJzZXJ2aWNlcy9hbGVydHMvYWxlcnRzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9ib29rbWFya3MvYm9va21hcmtzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jaGFydC9jaGFydC5zZXJ2aWNlLmpzIiwic2VydmljZXMvY29uZmlnL2NvbmZpZy5zZXJ2aWNlLmpzIiwic2VydmljZXMvZmlsdGVybWFuYWdlci9maWx0ZXJtYW5hZ2VyLmpzIiwic2VydmljZXMvbG9nZ2VyL2xvZ2dlci5zZXJ2aWNlLmpzIiwic2VydmljZXMvcGlsbHMvcGlsbHMuc2VydmljZS5qcyIsInNlcnZpY2VzL3NjaGVtYS9zY2hlbWEuc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUFLQSxDQUFDLENBQUMsWUFBWTs7O0VBR1osSUFBSSxXQUFXLE9BQU8sV0FBVyxjQUFjLE9BQU87OztFQUd0RCxJQUFJLGNBQWM7SUFDaEIsWUFBWTtJQUNaLFVBQVU7Ozs7RUFJWixJQUFJLGNBQWMsWUFBWSxPQUFPLFlBQVksV0FBVyxD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QUFJLE1BQU0sVUFBVTtRQUNsQixNQUFNLFNBQVMsU0FBUyxXQUFXLE1BQU07Ozs7SUFJN0MsT0FBTzs7QUFFWDs7O0FDOUpBOzs7QUFHQSxRQUFRLE9BQU87R0FDWixRQUFRLG1DQUFVLFNBQVMsSUFBSSxJQUFJLFVBQVU7SUFDNUMsSUFBSSxTQUFTOztJQUViLE9BQU8sU0FBUzs7SUFFaEIsT0FBTyxtQkFBbUIsU0FBUyxTQUFTO01BQzFDLElBQUksTUFBTTtNQUNWLElBQUksc0JBQXNCLE9BQU8sT0FBTyxZQUFZLFNBQVMsV0FBVzs7TUFFeEUsSUFBSSxNQUFNO1NBQ1Asb0JBQW9CLFFBQVEsb0JBQW9CLE1BQU0sR0FBRztRQUMxRDtNQUNGLE1BQU0sSUFBSSxNQUFNLElBQUksWUFBWSxLQUFLO01BQ3JDLE9BQU8sT0FBTyxPQUFPLFlBQVk7OztJQUduQyxPQUFPOztBQUVYIiwiZmlsZSI6InZsdWkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEpTT04zIHdpdGggY29tcGFjdCBzdHJpbmdpZnkgLS0gTW9kaWZpZWQgYnkgS2FuaXQgV29uZ3N1cGhhc2F3YXQuICAgaHR0cHM6Ly9naXRodWIuY29tL2thbml0dy9qc29uM1xuICpcbiAqIEZvcmtlZCBmcm9tIEpTT04gdjMuMy4yIHwgaHR0cHM6Ly9iZXN0aWVqcy5naXRodWIuaW8vanNvbjMgfCBDb3B5cmlnaHQgMjAxMi0yMDE0LCBLaXQgQ2FtYnJpZGdlIHwgaHR0cDovL2tpdC5taXQtbGljZW5zZS5vcmdcbiAqL1xuOyhmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCB0aGUgYGRlZmluZWAgZnVuY3Rpb24gZXhwb3NlZCBieSBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuIFRoZVxuICAvLyBzdHJpY3QgYGRlZmluZWAgY2hlY2sgaXMgbmVjZXNzYXJ5IGZvciBjb21wYXRpYmlsaXR5IHdpdGggYHIuanNgLlxuICB2YXIgaXNMb2FkZXIgPSB0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZDtcblxuICAvLyBBIHNldCBvZiB0eXBlcyB1c2VkIHRvIGRpc3Rpbmd1aXNoIG9iamVjdHMgZnJvbSBwcmltaXRpdmVzLlxuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgXCJmdW5jdGlvblwiOiB0cnVlLFxuICAgIFwib2JqZWN0XCI6IHRydWVcbiAgfTtcblxuICAvLyBEZXRlY3QgdGhlIGBleHBvcnRzYCBvYmplY3QgZXhwb3NlZCBieSBDb21tb25KUyBpbXBsZW1lbnRhdGlvbnMuXG4gIHZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG5cbiAgLy8gVXNlIHRoZSBgZ2xvYmFsYCBvYmplY3QgZXhwb3NlZCBieSBOb2RlIChpbmNsdWRpbmcgQnJvd3NlcmlmeSB2aWFcbiAgLy8gYGluc2VydC1tb2R1bGUtZ2xvYmFsc2ApLCBOYXJ3aGFsLCBhbmQgUmluZ28gYXMgdGhlIGRlZmF1bHQgY29udGV4dCxcbiAgLy8gYW5kIHRoZSBgd2luZG93YCBvYmplY3QgaW4gYnJvd3NlcnMuIFJoaW5vIGV4cG9ydHMgYSBgZ2xvYmFsYCBmdW5jdGlvblxuICAvLyBpbnN0ZWFkLlxuICB2YXIgcm9vdCA9IG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyB8fCB0aGlzLFxuICAgICAgZnJlZUdsb2JhbCA9IGZyZWVFeHBvcnRzICYmIG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIHR5cGVvZiBnbG9iYWwgPT0gXCJvYmplY3RcIiAmJiBnbG9iYWw7XG5cbiAgaWYgKGZyZWVHbG9iYWwgJiYgKGZyZWVHbG9iYWxbXCJnbG9iYWxcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcIndpbmRvd1wiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wic2VsZlwiXSA9PT0gZnJlZUdsb2JhbCkpIHtcbiAgICByb290ID0gZnJlZUdsb2JhbDtcbiAgfVxuXG4gIC8vIFB1YmxpYzogSW5pdGlhbGl6ZXMgSlNPTiAzIHVzaW5nIHRoZSBnaXZlbiBgY29udGV4dGAgb2JqZWN0LCBhdHRhY2hpbmcgdGhlXG4gIC8vIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgIGZ1bmN0aW9ucyB0byB0aGUgc3BlY2lmaWVkIGBleHBvcnRzYCBvYmplY3QuXG4gIGZ1bmN0aW9uIHJ1bkluQ29udGV4dChjb250ZXh0LCBleHBvcnRzKSB7XG4gICAgY29udGV4dCB8fCAoY29udGV4dCA9IHJvb3RbXCJPYmplY3RcIl0oKSk7XG4gICAgZXhwb3J0cyB8fCAoZXhwb3J0cyA9IHJvb3RbXCJPYmplY3RcIl0oKSk7XG5cbiAgICAvLyBOYXRpdmUgY29uc3RydWN0b3IgYWxpYXNlcy5cbiAgICB2YXIgTnVtYmVyID0gY29udGV4dFtcIk51bWJlclwiXSB8fCByb290W1wiTnVtYmVyXCJdLFxuICAgICAgICBTdHJpbmcgPSBjb250ZXh0W1wiU3RyaW5nXCJdIHx8IHJvb3RbXCJTdHJpbmdcIl0sXG4gICAgICAgIE9iamVjdCA9IGNvbnRleHRbXCJPYmplY3RcIl0gfHwgcm9vdFtcIk9iamVjdFwiXSxcbiAgICAgICAgRGF0ZSA9IGNvbnRleHRbXCJEYXRlXCJdIHx8IHJvb3RbXCJEYXRlXCJdLFxuICAgICAgICBTeW50YXhFcnJvciA9IGNvbnRleHRbXCJTeW50YXhFcnJvclwiXSB8fCByb290W1wiU3ludGF4RXJyb3JcIl0sXG4gICAgICAgIFR5cGVFcnJvciA9IGNvbnRleHRbXCJUeXBlRXJyb3JcIl0gfHwgcm9vdFtcIlR5cGVFcnJvclwiXSxcbiAgICAgICAgTWF0aCA9IGNvbnRleHRbXCJNYXRoXCJdIHx8IHJvb3RbXCJNYXRoXCJdLFxuICAgICAgICBuYXRpdmVKU09OID0gY29udGV4dFtcIkpTT05cIl0gfHwgcm9vdFtcIkpTT05cIl07XG5cbiAgICAvLyBEZWxlZ2F0ZSB0byB0aGUgbmF0aXZlIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgIGltcGxlbWVudGF0aW9ucy5cbiAgICBpZiAodHlwZW9mIG5hdGl2ZUpTT04gPT0gXCJvYmplY3RcIiAmJiBuYXRpdmVKU09OKSB7XG4gICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IG5hdGl2ZUpTT04uc3RyaW5naWZ5O1xuICAgICAgZXhwb3J0cy5wYXJzZSA9IG5hdGl2ZUpTT04ucGFyc2U7XG4gICAgfVxuXG4gICAgLy8gQ29udmVuaWVuY2UgYWxpYXNlcy5cbiAgICB2YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlLFxuICAgICAgICBnZXRDbGFzcyA9IG9iamVjdFByb3RvLnRvU3RyaW5nLFxuICAgICAgICBpc1Byb3BlcnR5LCBmb3JFYWNoLCB1bmRlZjtcblxuICAgIC8vIFRlc3QgdGhlIGBEYXRlI2dldFVUQypgIG1ldGhvZHMuIEJhc2VkIG9uIHdvcmsgYnkgQFlhZmZsZS5cbiAgICB2YXIgaXNFeHRlbmRlZCA9IG5ldyBEYXRlKC0zNTA5ODI3MzM0NTczMjkyKTtcbiAgICB0cnkge1xuICAgICAgLy8gVGhlIGBnZXRVVENGdWxsWWVhcmAsIGBNb250aGAsIGFuZCBgRGF0ZWAgbWV0aG9kcyByZXR1cm4gbm9uc2Vuc2ljYWxcbiAgICAgIC8vIHJlc3VsdHMgZm9yIGNlcnRhaW4gZGF0ZXMgaW4gT3BlcmEgPj0gMTAuNTMuXG4gICAgICBpc0V4dGVuZGVkID0gaXNFeHRlbmRlZC5nZXRVVENGdWxsWWVhcigpID09IC0xMDkyNTIgJiYgaXNFeHRlbmRlZC5nZXRVVENNb250aCgpID09PSAwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDRGF0ZSgpID09PSAxICYmXG4gICAgICAgIC8vIFNhZmFyaSA8IDIuMC4yIHN0b3JlcyB0aGUgaW50ZXJuYWwgbWlsbGlzZWNvbmQgdGltZSB2YWx1ZSBjb3JyZWN0bHksXG4gICAgICAgIC8vIGJ1dCBjbGlwcyB0aGUgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBkYXRlIG1ldGhvZHMgdG8gdGhlIHJhbmdlIG9mXG4gICAgICAgIC8vIHNpZ25lZCAzMi1iaXQgaW50ZWdlcnMgKFstMiAqKiAzMSwgMiAqKiAzMSAtIDFdKS5cbiAgICAgICAgaXNFeHRlbmRlZC5nZXRVVENIb3VycygpID09IDEwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWludXRlcygpID09IDM3ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDU2Vjb25kcygpID09IDYgJiYgaXNFeHRlbmRlZC5nZXRVVENNaWxsaXNlY29uZHMoKSA9PSA3MDg7XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuXG4gICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgd2hldGhlciB0aGUgbmF0aXZlIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBwYXJzZWBcbiAgICAvLyBpbXBsZW1lbnRhdGlvbnMgYXJlIHNwZWMtY29tcGxpYW50LiBCYXNlZCBvbiB3b3JrIGJ5IEtlbiBTbnlkZXIuXG4gICAgZnVuY3Rpb24gaGFzKG5hbWUpIHtcbiAgICAgIGlmIChoYXNbbmFtZV0gIT09IHVuZGVmKSB7XG4gICAgICAgIC8vIFJldHVybiBjYWNoZWQgZmVhdHVyZSB0ZXN0IHJlc3VsdC5cbiAgICAgICAgcmV0dXJuIGhhc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIHZhciBpc1N1cHBvcnRlZDtcbiAgICAgIGlmIChuYW1lID09IFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpIHtcbiAgICAgICAgLy8gSUUgPD0gNyBkb2Vzbid0IHN1cHBvcnQgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIHVzaW5nIHNxdWFyZVxuICAgICAgICAvLyBicmFja2V0IG5vdGF0aW9uLiBJRSA4IG9ubHkgc3VwcG9ydHMgdGhpcyBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBcImFcIlswXSAhPSBcImFcIjtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PSBcImpzb25cIikge1xuICAgICAgICAvLyBJbmRpY2F0ZXMgd2hldGhlciBib3RoIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBKU09OLnBhcnNlYCBhcmVcbiAgICAgICAgLy8gc3VwcG9ydGVkLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IGhhcyhcImpzb24tc3RyaW5naWZ5XCIpICYmIGhhcyhcImpzb24tcGFyc2VcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdmFsdWUsIHNlcmlhbGl6ZWQgPSAne1wiYVwiOlsxLHRydWUsZmFsc2UsbnVsbCxcIlxcXFx1MDAwMFxcXFxiXFxcXG5cXFxcZlxcXFxyXFxcXHRcIl19JztcbiAgICAgICAgLy8gVGVzdCBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tc3RyaW5naWZ5XCIpIHtcbiAgICAgICAgICB2YXIgc3RyaW5naWZ5ID0gZXhwb3J0cy5zdHJpbmdpZnksIHN0cmluZ2lmeVN1cHBvcnRlZCA9IHR5cGVvZiBzdHJpbmdpZnkgPT0gXCJmdW5jdGlvblwiICYmIGlzRXh0ZW5kZWQ7XG4gICAgICAgICAgaWYgKHN0cmluZ2lmeVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgLy8gQSB0ZXN0IGZ1bmN0aW9uIG9iamVjdCB3aXRoIGEgY3VzdG9tIGB0b0pTT05gIG1ldGhvZC5cbiAgICAgICAgICAgICh2YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9KS50b0pTT04gPSB2YWx1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN0cmluZ2lmeVN1cHBvcnRlZCA9XG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCAzLjFiMSBhbmQgYjIgc2VyaWFsaXplIHN0cmluZywgbnVtYmVyLCBhbmQgYm9vbGVhblxuICAgICAgICAgICAgICAgIC8vIHByaW1pdGl2ZXMgYXMgb2JqZWN0IGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgwKSA9PT0gXCIwXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIsIGFuZCBKU09OIDIgc2VyaWFsaXplIHdyYXBwZWQgcHJpbWl0aXZlcyBhcyBvYmplY3RcbiAgICAgICAgICAgICAgICAvLyBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IE51bWJlcigpKSA9PT0gXCIwXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IFN0cmluZygpKSA9PSAnXCJcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgdmFsdWUgaXMgYG51bGxgLCBgdW5kZWZpbmVkYCwgb3JcbiAgICAgICAgICAgICAgICAvLyBkb2VzIG5vdCBkZWZpbmUgYSBjYW5vbmljYWwgSlNPTiByZXByZXNlbnRhdGlvbiAodGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGB0b0pTT05gIHByb3BlcnRpZXMgYXMgd2VsbCwgKnVubGVzcyogdGhleSBhcmUgbmVzdGVkXG4gICAgICAgICAgICAgICAgLy8gd2l0aGluIGFuIG9iamVjdCBvciBhcnJheSkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KGdldENsYXNzKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBJRSA4IHNlcmlhbGl6ZXMgYHVuZGVmaW5lZGAgYXMgYFwidW5kZWZpbmVkXCJgLiBTYWZhcmkgPD0gNS4xLjcgYW5kXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjMgcGFzcyB0aGlzIHRlc3QuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHVuZGVmKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjcgYW5kIEZGIDMuMWIzIHRocm93IGBFcnJvcmBzIGFuZCBgVHlwZUVycm9yYHMsXG4gICAgICAgICAgICAgICAgLy8gcmVzcGVjdGl2ZWx5LCBpZiB0aGUgdmFsdWUgaXMgb21pdHRlZCBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgbm90IGEgbnVtYmVyLFxuICAgICAgICAgICAgICAgIC8vIHN0cmluZywgYXJyYXksIG9iamVjdCwgQm9vbGVhbiwgb3IgYG51bGxgIGxpdGVyYWwuIFRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBjdXN0b20gYHRvSlNPTmAgbWV0aG9kcyBhcyB3ZWxsLCB1bmxlc3MgdGhleSBhcmUgbmVzdGVkXG4gICAgICAgICAgICAgICAgLy8gaW5zaWRlIG9iamVjdCBvciBhcnJheSBsaXRlcmFscy4gWVVJIDMuMC4wYjEgaWdub3JlcyBjdXN0b20gYHRvSlNPTmBcbiAgICAgICAgICAgICAgICAvLyBtZXRob2RzIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh2YWx1ZSkgPT09IFwiMVwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt2YWx1ZV0pID09IFwiWzFdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgc2VyaWFsaXplcyBgW3VuZGVmaW5lZF1gIGFzIGBcIltdXCJgIGluc3RlYWQgb2ZcbiAgICAgICAgICAgICAgICAvLyBgXCJbbnVsbF1cImAuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZl0pID09IFwiW251bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBZVUkgMy4wLjBiMSBmYWlscyB0byBzZXJpYWxpemUgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShudWxsKSA9PSBcIm51bGxcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIGhhbHRzIHNlcmlhbGl6YXRpb24gaWYgYW4gYXJyYXkgY29udGFpbnMgYSBmdW5jdGlvbjpcbiAgICAgICAgICAgICAgICAvLyBgWzEsIHRydWUsIGdldENsYXNzLCAxXWAgc2VyaWFsaXplcyBhcyBcIlsxLHRydWUsXSxcIi4gRkYgMy4xYjNcbiAgICAgICAgICAgICAgICAvLyBlbGlkZXMgbm9uLUpTT04gdmFsdWVzIGZyb20gb2JqZWN0cyBhbmQgYXJyYXlzLCB1bmxlc3MgdGhleVxuICAgICAgICAgICAgICAgIC8vIGRlZmluZSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kcy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmLCBnZXRDbGFzcywgbnVsbF0pID09IFwiW251bGwsbnVsbCxudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHNlcmlhbGl6YXRpb24gdGVzdC4gRkYgMy4xYjEgdXNlcyBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZXNcbiAgICAgICAgICAgICAgICAvLyB3aGVyZSBjaGFyYWN0ZXIgZXNjYXBlIGNvZGVzIGFyZSBleHBlY3RlZCAoZS5nLiwgYFxcYmAgPT4gYFxcdTAwMDhgKS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoeyBcImFcIjogW3ZhbHVlLCB0cnVlLCBmYWxzZSwgbnVsbCwgXCJcXHgwMFxcYlxcblxcZlxcclxcdFwiXSB9KSA9PSBzZXJpYWxpemVkICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEgYW5kIGIyIGlnbm9yZSB0aGUgYGZpbHRlcmAgYW5kIGB3aWR0aGAgYXJndW1lbnRzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShudWxsLCB2YWx1ZSkgPT09IFwiMVwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFsxLCAyXSwgbnVsbCwgMSkgPT0gXCJbXFxuIDEsXFxuIDJcXG5dXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBKU09OIDIsIFByb3RvdHlwZSA8PSAxLjcsIGFuZCBvbGRlciBXZWJLaXQgYnVpbGRzIGluY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgLy8gc2VyaWFsaXplIGV4dGVuZGVkIHllYXJzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtOC42NGUxNSkpID09ICdcIi0yNzE4MjEtMDQtMjBUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFRoZSBtaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUsIGJ1dCByZXF1aXJlZCBpbiA1LjEuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKDguNjRlMTUpKSA9PSAnXCIrMjc1NzYwLTA5LTEzVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDw9IDExLjAgaW5jb3JyZWN0bHkgc2VyaWFsaXplcyB5ZWFycyBwcmlvciB0byAwIGFzIG5lZ2F0aXZlXG4gICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCB5ZWFycyBpbnN0ZWFkIG9mIHNpeC1kaWdpdCB5ZWFycy4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTYyMTk4NzU1MmU1KSkgPT0gJ1wiLTAwMDAwMS0wMS0wMVQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS41IGFuZCBPcGVyYSA+PSAxMC41MyBpbmNvcnJlY3RseSBzZXJpYWxpemUgbWlsbGlzZWNvbmRcbiAgICAgICAgICAgICAgICAvLyB2YWx1ZXMgbGVzcyB0aGFuIDEwMDAuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC0xKSkgPT0gJ1wiMTk2OS0xMi0zMVQyMzo1OTo1OS45OTlaXCInO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHN0cmluZ2lmeVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHN0cmluZ2lmeVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBUZXN0IGBKU09OLnBhcnNlYC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXBhcnNlXCIpIHtcbiAgICAgICAgICB2YXIgcGFyc2UgPSBleHBvcnRzLnBhcnNlO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyc2UgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYSBiYXJlIGxpdGVyYWwgaXMgcHJvdmlkZWQuXG4gICAgICAgICAgICAgIC8vIENvbmZvcm1pbmcgaW1wbGVtZW50YXRpb25zIHNob3VsZCBhbHNvIGNvZXJjZSB0aGUgaW5pdGlhbCBhcmd1bWVudCB0b1xuICAgICAgICAgICAgICAvLyBhIHN0cmluZyBwcmlvciB0byBwYXJzaW5nLlxuICAgICAgICAgICAgICBpZiAocGFyc2UoXCIwXCIpID09PSAwICYmICFwYXJzZShmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgcGFyc2luZyB0ZXN0LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gcGFyc2Uoc2VyaWFsaXplZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnNlU3VwcG9ydGVkID0gdmFsdWVbXCJhXCJdLmxlbmd0aCA9PSA1ICYmIHZhbHVlW1wiYVwiXVswXSA9PT0gMTtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuMiBhbmQgRkYgMy4xYjEgYWxsb3cgdW5lc2NhcGVkIHRhYnMgaW4gc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSAhcGFyc2UoJ1wiXFx0XCInKTtcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCBhbmQgNC4wLjEgYWxsb3cgbGVhZGluZyBgK2Agc2lnbnMgYW5kIGxlYWRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIHBvaW50cy4gRkYgNC4wLCA0LjAuMSwgYW5kIElFIDktMTAgYWxzbyBhbGxvd1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGNlcnRhaW4gb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjAxXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAsIDQuMC4xLCBhbmQgUmhpbm8gMS43UjMtUjQgYWxsb3cgdHJhaWxpbmcgZGVjaW1hbFxuICAgICAgICAgICAgICAgICAgICAgIC8vIHBvaW50cy4gVGhlc2UgZW52aXJvbm1lbnRzLCBhbG9uZyB3aXRoIEZGIDMuMWIxIGFuZCAyLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFsc28gYWxsb3cgdHJhaWxpbmcgY29tbWFzIGluIEpTT04gb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIxLlwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gcGFyc2VTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNbbmFtZV0gPSAhIWlzU3VwcG9ydGVkO1xuICAgIH1cblxuICAgIGlmICh0cnVlKSB7IC8vIHVzZWQgdG8gYmUgIWhhcyhcImpzb25cIilcbiAgICAgIC8vIENvbW1vbiBgW1tDbGFzc11dYCBuYW1lIGFsaWFzZXMuXG4gICAgICB2YXIgZnVuY3Rpb25DbGFzcyA9IFwiW29iamVjdCBGdW5jdGlvbl1cIixcbiAgICAgICAgICBkYXRlQ2xhc3MgPSBcIltvYmplY3QgRGF0ZV1cIixcbiAgICAgICAgICBudW1iZXJDbGFzcyA9IFwiW29iamVjdCBOdW1iZXJdXCIsXG4gICAgICAgICAgc3RyaW5nQ2xhc3MgPSBcIltvYmplY3QgU3RyaW5nXVwiLFxuICAgICAgICAgIGFycmF5Q2xhc3MgPSBcIltvYmplY3QgQXJyYXldXCIsXG4gICAgICAgICAgYm9vbGVhbkNsYXNzID0gXCJbb2JqZWN0IEJvb2xlYW5dXCI7XG5cbiAgICAgIC8vIERldGVjdCBpbmNvbXBsZXRlIHN1cHBvcnQgZm9yIGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyBieSBpbmRleC5cbiAgICAgIHZhciBjaGFySW5kZXhCdWdneSA9IGhhcyhcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKTtcblxuICAgICAgLy8gRGVmaW5lIGFkZGl0aW9uYWwgdXRpbGl0eSBtZXRob2RzIGlmIHRoZSBgRGF0ZWAgbWV0aG9kcyBhcmUgYnVnZ3kuXG4gICAgICBpZiAoIWlzRXh0ZW5kZWQpIHtcbiAgICAgICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICAgICAgLy8gQSBtYXBwaW5nIGJldHdlZW4gdGhlIG1vbnRocyBvZiB0aGUgeWVhciBhbmQgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW5cbiAgICAgICAgLy8gSmFudWFyeSAxc3QgYW5kIHRoZSBmaXJzdCBvZiB0aGUgcmVzcGVjdGl2ZSBtb250aC5cbiAgICAgICAgdmFyIE1vbnRocyA9IFswLCAzMSwgNTksIDkwLCAxMjAsIDE1MSwgMTgxLCAyMTIsIDI0MywgMjczLCAzMDQsIDMzNF07XG4gICAgICAgIC8vIEludGVybmFsOiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRoZSBVbml4IGVwb2NoIGFuZCB0aGVcbiAgICAgICAgLy8gZmlyc3QgZGF5IG9mIHRoZSBnaXZlbiBtb250aC5cbiAgICAgICAgdmFyIGdldERheSA9IGZ1bmN0aW9uICh5ZWFyLCBtb250aCkge1xuICAgICAgICAgIHJldHVybiBNb250aHNbbW9udGhdICsgMzY1ICogKHllYXIgLSAxOTcwKSArIGZsb29yKCh5ZWFyIC0gMTk2OSArIChtb250aCA9ICsobW9udGggPiAxKSkpIC8gNCkgLSBmbG9vcigoeWVhciAtIDE5MDEgKyBtb250aCkgLyAxMDApICsgZmxvb3IoKHllYXIgLSAxNjAxICsgbW9udGgpIC8gNDAwKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgaWYgYSBwcm9wZXJ0eSBpcyBhIGRpcmVjdCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW5cbiAgICAgIC8vIG9iamVjdC4gRGVsZWdhdGVzIHRvIHRoZSBuYXRpdmUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgbWV0aG9kLlxuICAgICAgaWYgKCEoaXNQcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5KSkge1xuICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgY29uc3RydWN0b3I7XG4gICAgICAgICAgaWYgKChtZW1iZXJzLl9fcHJvdG9fXyA9IG51bGwsIG1lbWJlcnMuX19wcm90b19fID0ge1xuICAgICAgICAgICAgLy8gVGhlICpwcm90byogcHJvcGVydHkgY2Fubm90IGJlIHNldCBtdWx0aXBsZSB0aW1lcyBpbiByZWNlbnRcbiAgICAgICAgICAgIC8vIHZlcnNpb25zIG9mIEZpcmVmb3ggYW5kIFNlYU1vbmtleS5cbiAgICAgICAgICAgIFwidG9TdHJpbmdcIjogMVxuICAgICAgICAgIH0sIG1lbWJlcnMpLnRvU3RyaW5nICE9IGdldENsYXNzKSB7XG4gICAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjMgZG9lc24ndCBpbXBsZW1lbnQgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAsIGJ1dFxuICAgICAgICAgICAgLy8gc3VwcG9ydHMgdGhlIG11dGFibGUgKnByb3RvKiBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgLy8gQ2FwdHVyZSBhbmQgYnJlYWsgdGhlIG9iamVjdCdzIHByb3RvdHlwZSBjaGFpbiAoc2VlIHNlY3Rpb24gOC42LjJcbiAgICAgICAgICAgICAgLy8gb2YgdGhlIEVTIDUuMSBzcGVjKS4gVGhlIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbiBwcmV2ZW50cyBhblxuICAgICAgICAgICAgICAvLyB1bnNhZmUgdHJhbnNmb3JtYXRpb24gYnkgdGhlIENsb3N1cmUgQ29tcGlsZXIuXG4gICAgICAgICAgICAgIHZhciBvcmlnaW5hbCA9IHRoaXMuX19wcm90b19fLCByZXN1bHQgPSBwcm9wZXJ0eSBpbiAodGhpcy5fX3Byb3RvX18gPSBudWxsLCB0aGlzKTtcbiAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcHJvdG90eXBlIGNoYWluLlxuICAgICAgICAgICAgICB0aGlzLl9fcHJvdG9fXyA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2FwdHVyZSBhIHJlZmVyZW5jZSB0byB0aGUgdG9wLWxldmVsIGBPYmplY3RgIGNvbnN0cnVjdG9yLlxuICAgICAgICAgICAgY29uc3RydWN0b3IgPSBtZW1iZXJzLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IHRvIHNpbXVsYXRlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGluXG4gICAgICAgICAgICAvLyBvdGhlciBlbnZpcm9ubWVudHMuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIHZhciBwYXJlbnQgPSAodGhpcy5jb25zdHJ1Y3RvciB8fCBjb25zdHJ1Y3RvcikucHJvdG90eXBlO1xuICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkgaW4gdGhpcyAmJiAhKHByb3BlcnR5IGluIHBhcmVudCAmJiB0aGlzW3Byb3BlcnR5XSA9PT0gcGFyZW50W3Byb3BlcnR5XSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBtZW1iZXJzID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gaXNQcm9wZXJ0eS5jYWxsKHRoaXMsIHByb3BlcnR5KTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IE5vcm1hbGl6ZXMgdGhlIGBmb3IuLi5pbmAgaXRlcmF0aW9uIGFsZ29yaXRobSBhY3Jvc3NcbiAgICAgIC8vIGVudmlyb25tZW50cy4gRWFjaCBlbnVtZXJhdGVkIGtleSBpcyB5aWVsZGVkIHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi5cbiAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2l6ZSA9IDAsIFByb3BlcnRpZXMsIG1lbWJlcnMsIHByb3BlcnR5O1xuXG4gICAgICAgIC8vIFRlc3RzIGZvciBidWdzIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50J3MgYGZvci4uLmluYCBhbGdvcml0aG0uIFRoZVxuICAgICAgICAvLyBgdmFsdWVPZmAgcHJvcGVydHkgaW5oZXJpdHMgdGhlIG5vbi1lbnVtZXJhYmxlIGZsYWcgZnJvbVxuICAgICAgICAvLyBgT2JqZWN0LnByb3RvdHlwZWAgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUsIE5ldHNjYXBlLCBhbmQgTW96aWxsYS5cbiAgICAgICAgKFByb3BlcnRpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy52YWx1ZU9mID0gMDtcbiAgICAgICAgfSkucHJvdG90eXBlLnZhbHVlT2YgPSAwO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgYFByb3BlcnRpZXNgIGNsYXNzLlxuICAgICAgICBtZW1iZXJzID0gbmV3IFByb3BlcnRpZXMoKTtcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBtZW1iZXJzKSB7XG4gICAgICAgICAgLy8gSWdub3JlIGFsbCBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBpZiAoaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBQcm9wZXJ0aWVzID0gbWVtYmVycyA9IG51bGw7XG5cbiAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBpdGVyYXRpb24gYWxnb3JpdGhtLlxuICAgICAgICBpZiAoIXNpemUpIHtcbiAgICAgICAgICAvLyBBIGxpc3Qgb2Ygbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgbWVtYmVycyA9IFtcInZhbHVlT2ZcIiwgXCJ0b1N0cmluZ1wiLCBcInRvTG9jYWxlU3RyaW5nXCIsIFwicHJvcGVydHlJc0VudW1lcmFibGVcIiwgXCJpc1Byb3RvdHlwZU9mXCIsIFwiaGFzT3duUHJvcGVydHlcIiwgXCJjb25zdHJ1Y3RvclwiXTtcbiAgICAgICAgICAvLyBJRSA8PSA4LCBNb3ppbGxhIDEuMCwgYW5kIE5ldHNjYXBlIDYuMiBpZ25vcmUgc2hhZG93ZWQgbm9uLWVudW1lcmFibGVcbiAgICAgICAgICAvLyBwcm9wZXJ0aWVzLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGxlbmd0aDtcbiAgICAgICAgICAgIHZhciBoYXNQcm9wZXJ0eSA9ICFpc0Z1bmN0aW9uICYmIHR5cGVvZiBvYmplY3QuY29uc3RydWN0b3IgIT0gXCJmdW5jdGlvblwiICYmIG9iamVjdFR5cGVzW3R5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHldICYmIG9iamVjdC5oYXNPd25Qcm9wZXJ0eSB8fCBpc1Byb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gR2Vja28gPD0gMS4wIGVudW1lcmF0ZXMgdGhlIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyB1bmRlclxuICAgICAgICAgICAgICAvLyBjZXJ0YWluIGNvbmRpdGlvbnM7IElFIGRvZXMgbm90LlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIGVhY2ggbm9uLWVudW1lcmFibGUgcHJvcGVydHkuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IG1lbWJlcnMubGVuZ3RoOyBwcm9wZXJ0eSA9IG1lbWJlcnNbLS1sZW5ndGhdOyBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmIGNhbGxiYWNrKHByb3BlcnR5KSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChzaXplID09IDIpIHtcbiAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjQgZW51bWVyYXRlcyBzaGFkb3dlZCBwcm9wZXJ0aWVzIHR3aWNlLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2V0IG9mIGl0ZXJhdGVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gU3RvcmUgZWFjaCBwcm9wZXJ0eSBuYW1lIHRvIHByZXZlbnQgZG91YmxlIGVudW1lcmF0aW9uLiBUaGVcbiAgICAgICAgICAgICAgLy8gYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIGlzIG5vdCBlbnVtZXJhdGVkIGR1ZSB0byBjcm9zcy1cbiAgICAgICAgICAgICAgLy8gZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmICFpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpICYmIChtZW1iZXJzW3Byb3BlcnR5XSA9IDEpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gYnVncyBkZXRlY3RlZDsgdXNlIHRoZSBzdGFuZGFyZCBgZm9yLi4uaW5gIGFsZ29yaXRobS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBpc0NvbnN0cnVjdG9yO1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgIShpc0NvbnN0cnVjdG9yID0gcHJvcGVydHkgPT09IFwiY29uc3RydWN0b3JcIikpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IGR1ZSB0b1xuICAgICAgICAgICAgLy8gY3Jvc3MtZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IgfHwgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgKHByb3BlcnR5ID0gXCJjb25zdHJ1Y3RvclwiKSkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvckVhY2gob2JqZWN0LCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAvLyBQdWJsaWM6IFNlcmlhbGl6ZXMgYSBKYXZhU2NyaXB0IGB2YWx1ZWAgYXMgYSBKU09OIHN0cmluZy4gVGhlIG9wdGlvbmFsXG4gICAgICAvLyBgZmlsdGVyYCBhcmd1bWVudCBtYXkgc3BlY2lmeSBlaXRoZXIgYSBmdW5jdGlvbiB0aGF0IGFsdGVycyBob3cgb2JqZWN0IGFuZFxuICAgICAgLy8gYXJyYXkgbWVtYmVycyBhcmUgc2VyaWFsaXplZCwgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncyBhbmQgbnVtYmVycyB0aGF0XG4gICAgICAvLyBpbmRpY2F0ZXMgd2hpY2ggcHJvcGVydGllcyBzaG91bGQgYmUgc2VyaWFsaXplZC4gVGhlIG9wdGlvbmFsIGB3aWR0aGBcbiAgICAgIC8vIGFyZ3VtZW50IG1heSBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgbnVtYmVyIHRoYXQgc3BlY2lmaWVzIHRoZSBpbmRlbnRhdGlvblxuICAgICAgLy8gbGV2ZWwgb2YgdGhlIG91dHB1dC5cbiAgICAgIGlmICh0cnVlKSB7XG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBFc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcXFxcXCInLFxuICAgICAgICAgIDg6IFwiXFxcXGJcIixcbiAgICAgICAgICAxMjogXCJcXFxcZlwiLFxuICAgICAgICAgIDEwOiBcIlxcXFxuXCIsXG4gICAgICAgICAgMTM6IFwiXFxcXHJcIixcbiAgICAgICAgICA5OiBcIlxcXFx0XCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQ29udmVydHMgYHZhbHVlYCBpbnRvIGEgemVyby1wYWRkZWQgc3RyaW5nIHN1Y2ggdGhhdCBpdHNcbiAgICAgICAgLy8gbGVuZ3RoIGlzIGF0IGxlYXN0IGVxdWFsIHRvIGB3aWR0aGAuIFRoZSBgd2lkdGhgIG11c3QgYmUgPD0gNi5cbiAgICAgICAgdmFyIGxlYWRpbmdaZXJvZXMgPSBcIjAwMDAwMFwiO1xuICAgICAgICB2YXIgdG9QYWRkZWRTdHJpbmcgPSBmdW5jdGlvbiAod2lkdGgsIHZhbHVlKSB7XG4gICAgICAgICAgLy8gVGhlIGB8fCAwYCBleHByZXNzaW9uIGlzIG5lY2Vzc2FyeSB0byB3b3JrIGFyb3VuZCBhIGJ1ZyBpblxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiB3aGVyZSBgMCA9PSAtMGAsIGJ1dCBgU3RyaW5nKC0wKSAhPT0gXCIwXCJgLlxuICAgICAgICAgIHJldHVybiAobGVhZGluZ1plcm9lcyArICh2YWx1ZSB8fCAwKSkuc2xpY2UoLXdpZHRoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogRG91YmxlLXF1b3RlcyBhIHN0cmluZyBgdmFsdWVgLCByZXBsYWNpbmcgYWxsIEFTQ0lJIGNvbnRyb2xcbiAgICAgICAgLy8gY2hhcmFjdGVycyAoY2hhcmFjdGVycyB3aXRoIGNvZGUgdW5pdCB2YWx1ZXMgYmV0d2VlbiAwIGFuZCAzMSkgd2l0aFxuICAgICAgICAvLyB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgUXVvdGUodmFsdWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuICAgICAgICB2YXIgdW5pY29kZVByZWZpeCA9IFwiXFxcXHUwMFwiO1xuICAgICAgICB2YXIgcXVvdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gJ1wiJywgaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGgsIHVzZUNoYXJJbmRleCA9ICFjaGFySW5kZXhCdWdneSB8fCBsZW5ndGggPiAxMDtcbiAgICAgICAgICB2YXIgc3ltYm9scyA9IHVzZUNoYXJJbmRleCAmJiAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5zcGxpdChcIlwiKSA6IHZhbHVlKTtcbiAgICAgICAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIHZhciBjaGFyQ29kZSA9IHZhbHVlLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGNoYXJhY3RlciBpcyBhIGNvbnRyb2wgY2hhcmFjdGVyLCBhcHBlbmQgaXRzIFVuaWNvZGUgb3JcbiAgICAgICAgICAgIC8vIHNob3J0aGFuZCBlc2NhcGUgc2VxdWVuY2U7IG90aGVyd2lzZSwgYXBwZW5kIHRoZSBjaGFyYWN0ZXIgYXMtaXMuXG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgODogY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEyOiBjYXNlIDEzOiBjYXNlIDM0OiBjYXNlIDkyOlxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBFc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVuaWNvZGVQcmVmaXggKyB0b1BhZGRlZFN0cmluZygyLCBjaGFyQ29kZS50b1N0cmluZygxNikpO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1c2VDaGFySW5kZXggPyBzeW1ib2xzW2luZGV4XSA6IHZhbHVlLmNoYXJBdChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQgKyAnXCInO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSBzZXJpYWxpemVzIGFuIG9iamVjdC4gSW1wbGVtZW50cyB0aGVcbiAgICAgICAgLy8gYFN0cihrZXksIGhvbGRlcilgLCBgSk8odmFsdWUpYCwgYW5kIGBKQSh2YWx1ZSlgIG9wZXJhdGlvbnMuXG4gICAgICAgIHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbiAocHJvcGVydHksIG9iamVjdCwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLCBzdGFjaywgbWF4TGluZUxlbmd0aCkge1xuICAgICAgICAgIHZhciB2YWx1ZSwgY2xhc3NOYW1lLCB5ZWFyLCBtb250aCwgZGF0ZSwgdGltZSwgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIG1pbGxpc2Vjb25kcywgcmVzdWx0cywgZWxlbWVudCwgaW5kZXgsIGxlbmd0aCwgcHJlZml4LCByZXN1bHQ7XG5cbiAgICAgICAgICBtYXhMaW5lTGVuZ3RoID0gbWF4TGluZUxlbmd0aCB8fCAwO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIE5lY2Vzc2FyeSBmb3IgaG9zdCBvYmplY3Qgc3VwcG9ydC5cbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gZGF0ZUNsYXNzICYmICFpc1Byb3BlcnR5LmNhbGwodmFsdWUsIFwidG9KU09OXCIpKSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0ZXMgYXJlIHNlcmlhbGl6ZWQgYWNjb3JkaW5nIHRvIHRoZSBgRGF0ZSN0b0pTT05gIG1ldGhvZFxuICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS45LjUuNDQuIFNlZSBzZWN0aW9uIDE1LjkuMS4xNVxuICAgICAgICAgICAgICAgIC8vIGZvciB0aGUgSVNPIDg2MDEgZGF0ZSB0aW1lIHN0cmluZyBmb3JtYXQuXG4gICAgICAgICAgICAgICAgaWYgKGdldERheSkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29tcHV0ZSB0aGUgeWVhciwgbW9udGgsIGRhdGUsIGhvdXJzLCBtaW51dGVzLFxuICAgICAgICAgICAgICAgICAgLy8gc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBpZiB0aGUgYGdldFVUQypgIG1ldGhvZHMgYXJlXG4gICAgICAgICAgICAgICAgICAvLyBidWdneS4gQWRhcHRlZCBmcm9tIEBZYWZmbGUncyBgZGF0ZS1zaGltYCBwcm9qZWN0LlxuICAgICAgICAgICAgICAgICAgZGF0ZSA9IGZsb29yKHZhbHVlIC8gODY0ZTUpO1xuICAgICAgICAgICAgICAgICAgZm9yICh5ZWFyID0gZmxvb3IoZGF0ZSAvIDM2NS4yNDI1KSArIDE5NzAgLSAxOyBnZXREYXkoeWVhciArIDEsIDApIDw9IGRhdGU7IHllYXIrKyk7XG4gICAgICAgICAgICAgICAgICBmb3IgKG1vbnRoID0gZmxvb3IoKGRhdGUgLSBnZXREYXkoeWVhciwgMCkpIC8gMzAuNDIpOyBnZXREYXkoeWVhciwgbW9udGggKyAxKSA8PSBkYXRlOyBtb250aCsrKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSAxICsgZGF0ZSAtIGdldERheSh5ZWFyLCBtb250aCk7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgYHRpbWVgIHZhbHVlIHNwZWNpZmllcyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheSAoc2VlIEVTXG4gICAgICAgICAgICAgICAgICAvLyA1LjEgc2VjdGlvbiAxNS45LjEuMikuIFRoZSBmb3JtdWxhIGAoQSAlIEIgKyBCKSAlIEJgIGlzIHVzZWRcbiAgICAgICAgICAgICAgICAgIC8vIHRvIGNvbXB1dGUgYEEgbW9kdWxvIEJgLCBhcyB0aGUgYCVgIG9wZXJhdG9yIGRvZXMgbm90XG4gICAgICAgICAgICAgICAgICAvLyBjb3JyZXNwb25kIHRvIHRoZSBgbW9kdWxvYCBvcGVyYXRpb24gZm9yIG5lZ2F0aXZlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgICB0aW1lID0gKHZhbHVlICUgODY0ZTUgKyA4NjRlNSkgJSA4NjRlNTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBob3VycywgbWludXRlcywgc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBhcmUgb2J0YWluZWQgYnlcbiAgICAgICAgICAgICAgICAgIC8vIGRlY29tcG9zaW5nIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5LiBTZWUgc2VjdGlvbiAxNS45LjEuMTAuXG4gICAgICAgICAgICAgICAgICBob3VycyA9IGZsb29yKHRpbWUgLyAzNmU1KSAlIDI0O1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IGZsb29yKHRpbWUgLyA2ZTQpICUgNjA7XG4gICAgICAgICAgICAgICAgICBzZWNvbmRzID0gZmxvb3IodGltZSAvIDFlMykgJSA2MDtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHRpbWUgJSAxZTM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHllYXIgPSB2YWx1ZS5nZXRVVENGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgICAgbW9udGggPSB2YWx1ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IHZhbHVlLmdldFVUQ0RhdGUoKTtcbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gdmFsdWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB2YWx1ZS5nZXRVVENNaW51dGVzKCk7XG4gICAgICAgICAgICAgICAgICBzZWNvbmRzID0gdmFsdWUuZ2V0VVRDU2Vjb25kcygpO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdmFsdWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycyBjb3JyZWN0bHkuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSAoeWVhciA8PSAwIHx8IHllYXIgPj0gMWU0ID8gKHllYXIgPCAwID8gXCItXCIgOiBcIitcIikgKyB0b1BhZGRlZFN0cmluZyg2LCB5ZWFyIDwgMCA/IC15ZWFyIDogeWVhcikgOiB0b1BhZGRlZFN0cmluZyg0LCB5ZWFyKSkgK1xuICAgICAgICAgICAgICAgICAgXCItXCIgKyB0b1BhZGRlZFN0cmluZygyLCBtb250aCArIDEpICsgXCItXCIgKyB0b1BhZGRlZFN0cmluZygyLCBkYXRlKSArXG4gICAgICAgICAgICAgICAgICAvLyBNb250aHMsIGRhdGVzLCBob3VycywgbWludXRlcywgYW5kIHNlY29uZHMgc2hvdWxkIGhhdmUgdHdvXG4gICAgICAgICAgICAgICAgICAvLyBkaWdpdHM7IG1pbGxpc2Vjb25kcyBzaG91bGQgaGF2ZSB0aHJlZS5cbiAgICAgICAgICAgICAgICAgIFwiVFwiICsgdG9QYWRkZWRTdHJpbmcoMiwgaG91cnMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBtaW51dGVzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgc2Vjb25kcykgK1xuICAgICAgICAgICAgICAgICAgLy8gTWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LjAsIGJ1dCByZXF1aXJlZCBpbiA1LjEuXG4gICAgICAgICAgICAgICAgICBcIi5cIiArIHRvUGFkZGVkU3RyaW5nKDMsIG1pbGxpc2Vjb25kcykgKyBcIlpcIjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlLnRvSlNPTiA9PSBcImZ1bmN0aW9uXCIgJiYgKChjbGFzc05hbWUgIT0gbnVtYmVyQ2xhc3MgJiYgY2xhc3NOYW1lICE9IHN0cmluZ0NsYXNzICYmIGNsYXNzTmFtZSAhPSBhcnJheUNsYXNzKSB8fCBpc1Byb3BlcnR5LmNhbGwodmFsdWUsIFwidG9KU09OXCIpKSkge1xuICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgYWRkcyBub24tc3RhbmRhcmQgYHRvSlNPTmAgbWV0aG9kcyB0byB0aGVcbiAgICAgICAgICAgICAgLy8gYE51bWJlcmAsIGBTdHJpbmdgLCBgRGF0ZWAsIGFuZCBgQXJyYXlgIHByb3RvdHlwZXMuIEpTT04gM1xuICAgICAgICAgICAgICAvLyBpZ25vcmVzIGFsbCBgdG9KU09OYCBtZXRob2RzIG9uIHRoZXNlIG9iamVjdHMgdW5sZXNzIHRoZXkgYXJlXG4gICAgICAgICAgICAgIC8vIGRlZmluZWQgZGlyZWN0bHkgb24gYW4gaW5zdGFuY2UuXG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9KU09OKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHJlcGxhY2VtZW50IGZ1bmN0aW9uIHdhcyBwcm92aWRlZCwgY2FsbCBpdCB0byBvYnRhaW4gdGhlIHZhbHVlXG4gICAgICAgICAgICAvLyBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2suY2FsbChvYmplY3QsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGJvb2xlYW5DbGFzcykge1xuICAgICAgICAgICAgLy8gQm9vbGVhbnMgYXJlIHJlcHJlc2VudGVkIGxpdGVyYWxseS5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICsgdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEpTT04gbnVtYmVycyBtdXN0IGJlIGZpbml0ZS4gYEluZmluaXR5YCBhbmQgYE5hTmAgYXJlIHNlcmlhbGl6ZWQgYXNcbiAgICAgICAgICAgIC8vIGBcIm51bGxcImAuXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCA/IFwiXCIgKyB2YWx1ZSA6IFwibnVsbFwiO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAvLyBTdHJpbmdzIGFyZSBkb3VibGUtcXVvdGVkIGFuZCBlc2NhcGVkLlxuICAgICAgICAgICAgcmV0dXJuIHF1b3RlKFwiXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoaXMgaXMgYSBsaW5lYXIgc2VhcmNoOyBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgLy8gaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mIHVuaXF1ZSBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gc3RhY2subGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgaWYgKHN0YWNrW2xlbmd0aF0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3ljbGljIHN0cnVjdHVyZXMgY2Fubm90IGJlIHNlcmlhbGl6ZWQgYnkgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWRkIHRoZSBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IGluZGVudGF0aW9uIGxldmVsIGFuZCBpbmRlbnQgb25lIGFkZGl0aW9uYWwgbGV2ZWwuXG4gICAgICAgICAgICBwcmVmaXggPSBpbmRlbnRhdGlvbjtcbiAgICAgICAgICAgIGluZGVudGF0aW9uICs9IHdoaXRlc3BhY2U7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCByZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBhcnJheSBlbGVtZW50cy5cbiAgICAgICAgICAgICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2VyaWFsaXplKGluZGV4LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLFxuICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnQgPT09IHVuZGVmID8gXCJudWxsXCIgOiBlbGVtZW50O1xuICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXggPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlICYmICh0b3RhbExlbmd0aCA+IG1heExpbmVMZW5ndGgpID9cbiAgICAgICAgICAgICAgICAgIFwiW1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJdXCIgOlxuICAgICAgICAgICAgICAgICAgXCJbXCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJdXCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgOiBcIltdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIGluZGV4PTA7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3QgbWVtYmVycy4gTWVtYmVycyBhcmUgc2VsZWN0ZWQgZnJvbVxuICAgICAgICAgICAgICAvLyBlaXRoZXIgYSB1c2VyLXNwZWNpZmllZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzLCBvciB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgIC8vIGl0c2VsZi5cbiAgICAgICAgICAgICAgZm9yRWFjaChwcm9wZXJ0aWVzIHx8IHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0LCBlbGVtZW50ID0gc2VyaWFsaXplKHByb3BlcnR5LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZikge1xuICAgICAgICAgICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjM6IFwiSWYgYGdhcGAge3doaXRlc3BhY2V9XG4gICAgICAgICAgICAgICAgICAvLyBpcyBub3QgdGhlIGVtcHR5IHN0cmluZywgbGV0IGBtZW1iZXJgIHtxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIn1cbiAgICAgICAgICAgICAgICAgIC8vIGJlIHRoZSBjb25jYXRlbmF0aW9uIG9mIGBtZW1iZXJgIGFuZCB0aGUgYHNwYWNlYCBjaGFyYWN0ZXIuXCJcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBcImBzcGFjZWAgY2hhcmFjdGVyXCIgcmVmZXJzIHRvIHRoZSBsaXRlcmFsIHNwYWNlXG4gICAgICAgICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG5vdCB0aGUgYHNwYWNlYCB7d2lkdGh9IGFyZ3VtZW50IHByb3ZpZGVkIHRvXG4gICAgICAgICAgICAgICAgICAvLyBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcXVvdGUocHJvcGVydHkpICsgXCI6XCIgKyAod2hpdGVzcGFjZSA/IFwiIFwiIDogXCJcIikgKyBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCsrID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlICYmICh0b3RhbExlbmd0aCA+IG1heExpbmVMZW5ndGgpID9cbiAgICAgICAgICAgICAgICAgIFwie1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJ9XCIgOlxuICAgICAgICAgICAgICAgICAgXCJ7XCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJ9XCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgOiBcInt9XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIG9iamVjdCBmcm9tIHRoZSB0cmF2ZXJzZWQgb2JqZWN0IHN0YWNrLlxuICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnN0cmluZ2lmeWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuXG4gICAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgbWF4TGluZUxlbmd0aCkge1xuICAgICAgICAgIHZhciB3aGl0ZXNwYWNlLCBjYWxsYmFjaywgcHJvcGVydGllcywgY2xhc3NOYW1lO1xuICAgICAgICAgIGlmIChvYmplY3RUeXBlc1t0eXBlb2YgZmlsdGVyXSAmJiBmaWx0ZXIpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbChmaWx0ZXIpKSA9PSBmdW5jdGlvbkNsYXNzKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrID0gZmlsdGVyO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBwcm9wZXJ0eSBuYW1lcyBhcnJheSBpbnRvIGEgbWFrZXNoaWZ0IHNldC5cbiAgICAgICAgICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGZpbHRlci5sZW5ndGgsIHZhbHVlOyBpbmRleCA8IGxlbmd0aDsgdmFsdWUgPSBmaWx0ZXJbaW5kZXgrK10sICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkpLCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSAmJiAocHJvcGVydGllc1t2YWx1ZV0gPSAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh3aWR0aCkge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHdpZHRoKSkgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgYHdpZHRoYCB0byBhbiBpbnRlZ2VyIGFuZCBjcmVhdGUgYSBzdHJpbmcgY29udGFpbmluZ1xuICAgICAgICAgICAgICAvLyBgd2lkdGhgIG51bWJlciBvZiBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICBpZiAoKHdpZHRoIC09IHdpZHRoICUgMSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yICh3aGl0ZXNwYWNlID0gXCJcIiwgd2lkdGggPiAxMCAmJiAod2lkdGggPSAxMCk7IHdoaXRlc3BhY2UubGVuZ3RoIDwgd2lkdGg7IHdoaXRlc3BhY2UgKz0gXCIgXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgICB3aGl0ZXNwYWNlID0gd2lkdGgubGVuZ3RoIDw9IDEwID8gd2lkdGggOiB3aWR0aC5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiBkaXNjYXJkcyB0aGUgdmFsdWVzIGFzc29jaWF0ZWQgd2l0aCBlbXB0eSBzdHJpbmcga2V5c1xuICAgICAgICAgIC8vIChgXCJcImApIG9ubHkgaWYgdGhleSBhcmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gYW4gb2JqZWN0IG1lbWJlciBsaXN0XG4gICAgICAgICAgLy8gKGUuZy4sIGAhKFwiXCIgaW4geyBcIlwiOiAxfSlgKS5cbiAgICAgICAgICByZXR1cm4gc2VyaWFsaXplKFwiXCIsICh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHNvdXJjZSwgdmFsdWUpLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgXCJcIiwgW10sIG1heExpbmVMZW5ndGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGV4cG9ydHMuY29tcGFjdFN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgpe1xuICAgICAgICAgIHJldHVybiBleHBvcnRzLnN0cmluZ2lmeShzb3VyY2UsIGZpbHRlciwgd2lkdGgsIDYwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQdWJsaWM6IFBhcnNlcyBhIEpTT04gc291cmNlIHN0cmluZy5cbiAgICAgIGlmICghaGFzKFwianNvbi1wYXJzZVwiKSkge1xuICAgICAgICB2YXIgZnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIHVuZXNjYXBlZFxuICAgICAgICAvLyBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIFVuZXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcIicsXG4gICAgICAgICAgNDc6IFwiL1wiLFxuICAgICAgICAgIDk4OiBcIlxcYlwiLFxuICAgICAgICAgIDExNjogXCJcXHRcIixcbiAgICAgICAgICAxMTA6IFwiXFxuXCIsXG4gICAgICAgICAgMTAyOiBcIlxcZlwiLFxuICAgICAgICAgIDExNDogXCJcXHJcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBTdG9yZXMgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgdmFyIEluZGV4LCBTb3VyY2U7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlc2V0cyB0aGUgcGFyc2VyIHN0YXRlIGFuZCB0aHJvd3MgYSBgU3ludGF4RXJyb3JgLlxuICAgICAgICB2YXIgYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHRocm93IFN5bnRheEVycm9yKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJldHVybnMgdGhlIG5leHQgdG9rZW4sIG9yIGBcIiRcImAgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZFxuICAgICAgICAvLyB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLiBBIHRva2VuIG1heSBiZSBhIHN0cmluZywgbnVtYmVyLCBgbnVsbGBcbiAgICAgICAgLy8gbGl0ZXJhbCwgb3IgQm9vbGVhbiBsaXRlcmFsLlxuICAgICAgICB2YXIgbGV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHZhbHVlLCBiZWdpbiwgcG9zaXRpb24sIGlzU2lnbmVkLCBjaGFyQ29kZTtcbiAgICAgICAgICB3aGlsZSAoSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTM6IGNhc2UgMzI6XG4gICAgICAgICAgICAgICAgLy8gU2tpcCB3aGl0ZXNwYWNlIHRva2VucywgaW5jbHVkaW5nIHRhYnMsIGNhcnJpYWdlIHJldHVybnMsIGxpbmVcbiAgICAgICAgICAgICAgICAvLyBmZWVkcywgYW5kIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAxMjM6IGNhc2UgMTI1OiBjYXNlIDkxOiBjYXNlIDkzOiBjYXNlIDU4OiBjYXNlIDQ0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGEgcHVuY3R1YXRvciB0b2tlbiAoYHtgLCBgfWAsIGBbYCwgYF1gLCBgOmAsIG9yIGAsYCkgYXRcbiAgICAgICAgICAgICAgICAvLyB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNoYXJJbmRleEJ1Z2d5ID8gc291cmNlLmNoYXJBdChJbmRleCkgOiBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAgIC8vIGBcImAgZGVsaW1pdHMgYSBKU09OIHN0cmluZzsgYWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kXG4gICAgICAgICAgICAgICAgLy8gYmVnaW4gcGFyc2luZyB0aGUgc3RyaW5nLiBTdHJpbmcgdG9rZW5zIGFyZSBwcmVmaXhlZCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIgdG8gZGlzdGluZ3Vpc2ggdGhlbSBmcm9tIHB1bmN0dWF0b3JzIGFuZFxuICAgICAgICAgICAgICAgIC8vIGVuZC1vZi1zdHJpbmcgdG9rZW5zLlxuICAgICAgICAgICAgICAgIGZvciAodmFsdWUgPSBcIkBcIiwgSW5kZXgrKzsgSW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVuZXNjYXBlZCBBU0NJSSBjb250cm9sIGNoYXJhY3RlcnMgKHRob3NlIHdpdGggYSBjb2RlIHVuaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGFuIHRoZSBzcGFjZSBjaGFyYWN0ZXIpIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyQ29kZSA9PSA5Mikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIHJldmVyc2Ugc29saWR1cyAoYFxcYCkgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhbiBlc2NhcGVkXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRyb2wgY2hhcmFjdGVyIChpbmNsdWRpbmcgYFwiYCwgYFxcYCwgYW5kIGAvYCkgb3IgVW5pY29kZVxuICAgICAgICAgICAgICAgICAgICAvLyBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDkyOiBjYXNlIDM0OiBjYXNlIDQ3OiBjYXNlIDk4OiBjYXNlIDExNjogY2FzZSAxMTA6IGNhc2UgMTAyOiBjYXNlIDExNDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IFVuZXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSAxMTc6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBgXFx1YCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGEgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBmaXJzdCBjaGFyYWN0ZXIgYW5kIHZhbGlkYXRlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCBjb2RlIHBvaW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4ICsgNDsgSW5kZXggPCBwb3NpdGlvbjsgSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQSB2YWxpZCBzZXF1ZW5jZSBjb21wcmlzZXMgZm91ciBoZXhkaWdpdHMgKGNhc2UtXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluc2Vuc2l0aXZlKSB0aGF0IGZvcm0gYSBzaW5nbGUgaGV4YWRlY2ltYWwgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3IHx8IGNoYXJDb2RlID49IDk3ICYmIGNoYXJDb2RlIDw9IDEwMiB8fCBjaGFyQ29kZSA+PSA2NSAmJiBjaGFyQ29kZSA8PSA3MCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBmcm9tQ2hhckNvZGUoXCIweFwiICsgc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gQW4gdW5lc2NhcGVkIGRvdWJsZS1xdW90ZSBjaGFyYWN0ZXIgbWFya3MgdGhlIGVuZCBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9wdGltaXplIGZvciB0aGUgY29tbW9uIGNhc2Ugd2hlcmUgYSBzdHJpbmcgaXMgdmFsaWQuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjaGFyQ29kZSA+PSAzMiAmJiBjaGFyQ29kZSAhPSA5MiAmJiBjaGFyQ29kZSAhPSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIHRoZSBzdHJpbmcgYXMtaXMuXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmQgcmV0dXJuIHRoZSByZXZpdmVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVudGVybWluYXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBudW1iZXJzIGFuZCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgbmVnYXRpdmUgc2lnbiwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGFuIGludGVnZXIgb3IgZmxvYXRpbmctcG9pbnQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB7XG4gICAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIHplcm9lcyBhcmUgaW50ZXJwcmV0ZWQgYXMgb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4ICsgMSkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBvY3RhbCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBpbnRlZ2VyIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgIGZvciAoOyBJbmRleCA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBJbmRleCsrKTtcbiAgICAgICAgICAgICAgICAgIC8vIEZsb2F0cyBjYW5ub3QgY29udGFpbiBhIGxlYWRpbmcgZGVjaW1hbCBwb2ludDsgaG93ZXZlciwgdGhpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZSBpcyBhbHJlYWR5IGFjY291bnRlZCBmb3IgYnkgdGhlIHBhcnNlci5cbiAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZGVjaW1hbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCB0cmFpbGluZyBkZWNpbWFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIGV4cG9uZW50cy4gVGhlIGBlYCBkZW5vdGluZyB0aGUgZXhwb25lbnQgaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UtaW5zZW5zaXRpdmUuXG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAxMDEgfHwgY2hhckNvZGUgPT0gNjkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBwYXN0IHRoZSBzaWduIGZvbGxvd2luZyB0aGUgZXhwb25lbnQsIGlmIG9uZSBpc1xuICAgICAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0MyB8fCBjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGV4cG9uZW50aWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4OyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBlbXB0eSBleHBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDb2VyY2UgdGhlIHBhcnNlZCB2YWx1ZSB0byBhIEphdmFTY3JpcHQgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAgcmV0dXJuICtzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQSBuZWdhdGl2ZSBzaWduIG1heSBvbmx5IHByZWNlZGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBpZiAoaXNTaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGB0cnVlYCwgYGZhbHNlYCwgYW5kIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNSkgPT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA1O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwibnVsbFwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVucmVjb2duaXplZCB0b2tlbi5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXR1cm4gdGhlIHNlbnRpbmVsIGAkYCBjaGFyYWN0ZXIgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZCB0aGUgZW5kXG4gICAgICAgICAgLy8gb2YgdGhlIHNvdXJjZSBzdHJpbmcuXG4gICAgICAgICAgcmV0dXJuIFwiJFwiO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBQYXJzZXMgYSBKU09OIGB2YWx1ZWAgdG9rZW4uXG4gICAgICAgIHZhciBnZXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0cywgaGFzTWVtYmVycztcbiAgICAgICAgICBpZiAodmFsdWUgPT0gXCIkXCIpIHtcbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgZW5kIG9mIGlucHV0LlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBpZiAoKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pID09IFwiQFwiKSB7XG4gICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2VudGluZWwgYEBgIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGFyc2Ugb2JqZWN0IGFuZCBhcnJheSBsaXRlcmFscy5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIltcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIGFycmF5LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBhcnJheS5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIHNxdWFyZSBicmFja2V0IG1hcmtzIHRoZSBlbmQgb2YgdGhlIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGFycmF5IGxpdGVyYWwgY29udGFpbnMgZWxlbWVudHMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdGluZyB0aGUgcHJldmlvdXMgZWxlbWVudCBmcm9tIHRoZVxuICAgICAgICAgICAgICAgIC8vIG5leHQuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBhcnJheSBlbGVtZW50LlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBFbGlzaW9ucyBhbmQgbGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0KHZhbHVlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09IFwie1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gb2JqZWN0LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBjdXJseSBicmFjZSBtYXJrcyB0aGUgZW5kIG9mIHRoZSBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb2JqZWN0IGxpdGVyYWwgY29udGFpbnMgbWVtYmVycywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0b3IuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggb2JqZWN0IG1lbWJlci5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQsIG9iamVjdCBwcm9wZXJ0eSBuYW1lcyBtdXN0IGJlXG4gICAgICAgICAgICAgICAgLy8gZG91YmxlLXF1b3RlZCBzdHJpbmdzLCBhbmQgYSBgOmAgbXVzdCBzZXBhcmF0ZSBlYWNoIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgLy8gbmFtZSBhbmQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiIHx8IHR5cGVvZiB2YWx1ZSAhPSBcInN0cmluZ1wiIHx8IChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSAhPSBcIkBcIiB8fCBsZXgoKSAhPSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0c1t2YWx1ZS5zbGljZSgxKV0gPSBnZXQobGV4KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0b2tlbiBlbmNvdW50ZXJlZC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogVXBkYXRlcyBhIHRyYXZlcnNlZCBvYmplY3QgbWVtYmVyLlxuICAgICAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIGVsZW1lbnQgPSB3YWxrKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3VyY2VbcHJvcGVydHldID0gZWxlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBhIHBhcnNlZCBKU09OIG9iamVjdCwgaW52b2tpbmcgdGhlXG4gICAgICAgIC8vIGBjYWxsYmFja2AgZnVuY3Rpb24gZm9yIGVhY2ggdmFsdWUuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBXYWxrKGhvbGRlciwgbmFtZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIHZhciB3YWxrID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW3Byb3BlcnR5XSwgbGVuZ3RoO1xuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gYGZvckVhY2hgIGNhbid0IGJlIHVzZWQgdG8gdHJhdmVyc2UgYW4gYXJyYXkgaW4gT3BlcmEgPD0gOC41NFxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpdHMgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW1wbGVtZW50YXRpb24gcmV0dXJucyBgZmFsc2VgXG4gICAgICAgICAgICAvLyBmb3IgYXJyYXkgaW5kaWNlcyAoZS5nLiwgYCFbMSwgMiwgM10uaGFzT3duUHJvcGVydHkoXCIwXCIpYCkuXG4gICAgICAgICAgICBpZiAoZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBsZW5ndGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwoc291cmNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04ucGFyc2VgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCwgdmFsdWU7XG4gICAgICAgICAgSW5kZXggPSAwO1xuICAgICAgICAgIFNvdXJjZSA9IFwiXCIgKyBzb3VyY2U7XG4gICAgICAgICAgcmVzdWx0ID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAvLyBJZiBhIEpTT04gc3RyaW5nIGNvbnRhaW5zIG11bHRpcGxlIHRva2VucywgaXQgaXMgaW52YWxpZC5cbiAgICAgICAgICBpZiAobGV4KCkgIT0gXCIkXCIpIHtcbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlc2V0IHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayAmJiBnZXRDbGFzcy5jYWxsKGNhbGxiYWNrKSA9PSBmdW5jdGlvbkNsYXNzID8gd2FsaygodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSByZXN1bHQsIHZhbHVlKSwgXCJcIiwgY2FsbGJhY2spIDogcmVzdWx0O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydHNbXCJydW5JbkNvbnRleHRcIl0gPSBydW5JbkNvbnRleHQ7XG4gICAgcmV0dXJuIGV4cG9ydHM7XG4gIH1cblxuICBpZiAoZnJlZUV4cG9ydHMgJiYgIWlzTG9hZGVyKSB7XG4gICAgLy8gRXhwb3J0IGZvciBDb21tb25KUyBlbnZpcm9ubWVudHMuXG4gICAgcnVuSW5Db250ZXh0KHJvb3QsIGZyZWVFeHBvcnRzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBFeHBvcnQgZm9yIHdlYiBicm93c2VycyBhbmQgSmF2YVNjcmlwdCBlbmdpbmVzLlxuICAgIHZhciBuYXRpdmVKU09OID0gcm9vdC5KU09OLFxuICAgICAgICBwcmV2aW91c0pTT04gPSByb290W1wiSlNPTjNcIl0sXG4gICAgICAgIGlzUmVzdG9yZWQgPSBmYWxzZTtcblxuICAgIHZhciBKU09OMyA9IHJ1bkluQ29udGV4dChyb290LCAocm9vdFtcIkpTT04zXCJdID0ge1xuICAgICAgLy8gUHVibGljOiBSZXN0b3JlcyB0aGUgb3JpZ2luYWwgdmFsdWUgb2YgdGhlIGdsb2JhbCBgSlNPTmAgb2JqZWN0IGFuZFxuICAgICAgLy8gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgYEpTT04zYCBvYmplY3QuXG4gICAgICBcIm5vQ29uZmxpY3RcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWlzUmVzdG9yZWQpIHtcbiAgICAgICAgICBpc1Jlc3RvcmVkID0gdHJ1ZTtcbiAgICAgICAgICByb290LkpTT04gPSBuYXRpdmVKU09OO1xuICAgICAgICAgIHJvb3RbXCJKU09OM1wiXSA9IHByZXZpb3VzSlNPTjtcbiAgICAgICAgICBuYXRpdmVKU09OID0gcHJldmlvdXNKU09OID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSlNPTjM7XG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgcm9vdC5KU09OID0ge1xuICAgICAgXCJwYXJzZVwiOiBKU09OMy5wYXJzZSxcbiAgICAgIFwic3RyaW5naWZ5XCI6IEpTT04zLnN0cmluZ2lmeVxuICAgIH07XG4gIH1cblxuICAvLyBFeHBvcnQgZm9yIGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy5cbiAgaWYgKGlzTG9hZGVyKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBKU09OMztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIndpbmRvdy4gICAgIHZsU2NoZW1hID0ge1xuICBcIm9uZU9mXCI6IFtcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0V4dGVuZGVkVW5pdFNwZWNcIixcbiAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTY2hlbWEgZm9yIGEgdW5pdCBWZWdhLUxpdGUgc3BlY2lmaWNhdGlvbiwgd2l0aCB0aGUgc3ludGFjdGljIHN1Z2FyIGV4dGVuc2lvbnM6XFxuXFxuLSBgcm93YCBhbmQgYGNvbHVtbmAgYXJlIGluY2x1ZGVkIGluIHRoZSBlbmNvZGluZy5cXG5cXG4tIChGdXR1cmUpIGxhYmVsLCBib3ggcGxvdFxcblxcblxcblxcbk5vdGU6IHRoZSBzcGVjIGNvdWxkIGNvbnRhaW4gZmFjZXQuXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRTcGVjXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTGF5ZXJTcGVjXCJcbiAgICB9XG4gIF0sXG4gIFwiZGVmaW5pdGlvbnNcIjoge1xuICAgIFwiRXh0ZW5kZWRVbml0U3BlY1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibWFya1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJrIHR5cGUuXFxuXFxuT25lIG9mIGBcXFwiYmFyXFxcImAsIGBcXFwiY2lyY2xlXFxcImAsIGBcXFwic3F1YXJlXFxcImAsIGBcXFwidGlja1xcXCJgLCBgXFxcImxpbmVcXFwiYCxcXG5cXG5gXFxcImFyZWFcXFwiYCwgYFxcXCJwb2ludFxcXCJgLCBgXFxcInJ1bGVcXFwiYCwgYW5kIGBcXFwidGV4dFxcXCJgLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5jb2RpbmdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRW5jb2RpbmdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBrZXktdmFsdWUgbWFwcGluZyBiZXR3ZWVuIGVuY29kaW5nIGNoYW5uZWxzIGFuZCBkZWZpbml0aW9uIG9mIGZpZWxkcy5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5hbWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSB2aXN1YWxpemF0aW9uIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgbWFyayBmb3IgY29tbWVudGluZyBwdXJwb3NlLlxcblxcblRoaXMgcHJvcGVydHkgaGFzIG5vIGVmZmVjdCBvbiB0aGUgb3V0cHV0IHZpc3VhbGl6YXRpb24uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRhdGEgc291cmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHJhbnNmb3JtXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIGZpbHRlciBhbmQgbmV3IGZpZWxkIGNhbGN1bGF0aW9uLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJtYXJrXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiTWFya1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiYXJlYVwiLFxuICAgICAgICBcImJhclwiLFxuICAgICAgICBcImxpbmVcIixcbiAgICAgICAgXCJwb2ludFwiLFxuICAgICAgICBcInRleHRcIixcbiAgICAgICAgXCJ0aWNrXCIsXG4gICAgICAgIFwicnVsZVwiLFxuICAgICAgICBcImNpcmNsZVwiLFxuICAgICAgICBcInNxdWFyZVwiLFxuICAgICAgICBcImVycm9yQmFyXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRW5jb2RpbmdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvd1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVmVydGljYWwgZmFjZXRzIGZvciB0cmVsbGlzIHBsb3RzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sdW1uXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJIb3Jpem9udGFsIGZhY2V0cyBmb3IgdHJlbGxpcyBwbG90cy5cIlxuICAgICAgICB9LFxuICAgICAgICBcInhcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlggY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWSBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ4MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWDIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcInkyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgZmlsbCBvciBzdHJva2UgY29sb3IgYmFzZWQgb24gbWFyayB0eXBlLlxcblxcbihCeSBkZWZhdWx0LCBmaWxsIGNvbG9yIGZvciBgYXJlYWAsIGBiYXJgLCBgdGlja2AsIGB0ZXh0YCwgYGNpcmNsZWAsIGFuZCBgc3F1YXJlYCAvXFxuXFxuc3Ryb2tlIGNvbG9yIGZvciBgbGluZWAgYW5kIGBwb2ludGAuKVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcGFjaXR5IG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGNhbiBiZSBhIHZhbHVlIG9yIGluIGEgcmFuZ2UuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaXplXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYHBvaW50YCwgYHNxdWFyZWAgYW5kIGBjaXJjbGVgXFxuXFxu4oCTIHRoZSBzeW1ib2wgc2l6ZSwgb3IgcGl4ZWwgYXJlYSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgYmFyYCBhbmQgYHRpY2tgIOKAkyB0aGUgYmFyIGFuZCB0aWNrJ3Mgc2l6ZS5cXG5cXG4tIEZvciBgdGV4dGAg4oCTIHRoZSB0ZXh0J3MgZm9udCBzaXplLlxcblxcbi0gU2l6ZSBpcyBjdXJyZW50bHkgdW5zdXBwb3J0ZWQgZm9yIGBsaW5lYCBhbmQgYGFyZWFgLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN5bWJvbCdzIHNoYXBlIChvbmx5IGZvciBgcG9pbnRgIG1hcmtzKS4gVGhlIHN1cHBvcnRlZCB2YWx1ZXMgYXJlXFxuXFxuYFxcXCJjaXJjbGVcXFwiYCAoZGVmYXVsdCksIGBcXFwic3F1YXJlXFxcImAsIGBcXFwiY3Jvc3NcXFwiYCwgYFxcXCJkaWFtb25kXFxcImAsIGBcXFwidHJpYW5nbGUtdXBcXFwiYCxcXG5cXG5vciBgXFxcInRyaWFuZ2xlLWRvd25cXFwiYCwgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXRhaWxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZGRpdGlvbmFsIGxldmVscyBvZiBkZXRhaWwgZm9yIGdyb3VwaW5nIGRhdGEgaW4gYWdncmVnYXRlIHZpZXdzIGFuZFxcblxcbmluIGxpbmUgYW5kIGFyZWEgbWFya3Mgd2l0aG91dCBtYXBwaW5nIGRhdGEgdG8gYSBzcGVjaWZpYyB2aXN1YWwgY2hhbm5lbC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBvZiB0aGUgYHRleHRgIG1hcmsuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGF0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9yZGVyIG9mIGRhdGEgcG9pbnRzIGluIGxpbmUgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkxheWVyIG9yZGVyIGZvciBub24tc3RhY2tlZCBtYXJrcywgb3Igc3RhY2sgb3JkZXIgZm9yIHN0YWNrZWQgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJQb3NpdGlvbkNoYW5uZWxEZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImF4aXNcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0RmllbGRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXhpc1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibGFiZWxBbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9ybWF0dGluZyBwYXR0ZXJuIGZvciBheGlzIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9yaWVudFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzT3JpZW50XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvcmllbnRhdGlvbiBvZiB0aGUgYXhpcy4gT25lIG9mIHRvcCwgYm90dG9tLCBsZWZ0IG9yIHJpZ2h0LiBUaGUgb3JpZW50YXRpb24gY2FuIGJlIHVzZWQgdG8gZnVydGhlciBzcGVjaWFsaXplIHRoZSBheGlzIHR5cGUgKGUuZy4sIGEgeSBheGlzIG9yaWVudGVkIGZvciB0aGUgcmlnaHQgZWRnZSBvZiB0aGUgY2hhcnQpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIGZvciB0aGUgYXhpcy4gU2hvd3MgZmllbGQgbmFtZSBhbmQgaXRzIGZ1bmN0aW9uIGJ5IGRlZmF1bHQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZXNcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaWR0aCBvZiB0aGUgYXhpcyBsaW5lXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYXllclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGluZGljYXRpbmcgaWYgdGhlIGF4aXMgKGFuZCBhbnkgZ3JpZGxpbmVzKSBzaG91bGQgYmUgcGxhY2VkIGFib3ZlIG9yIGJlbG93IHRoZSBkYXRhIG1hcmtzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgYXhpcyBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBheGlzIGxpbmUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBmbGFnIGluZGljYXRlIGlmIGdyaWRsaW5lcyBzaG91bGQgYmUgY3JlYXRlZCBpbiBhZGRpdGlvbiB0byB0aWNrcy4gSWYgYGdyaWRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIFJPVyBhbmQgQ09MLiBGb3IgWCBhbmQgWSwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBxdWFudGl0YXRpdmUgYW5kIHRpbWUgZmllbGRzIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBncmlkbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIGdyaWQgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgb2YgZ3JpZCAodmFsdWUgYmV0d2VlbiBbMCwxXSlcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBncmlkIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJFbmFibGUgb3IgZGlzYWJsZSBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYWxpZ25tZW50IGZvciB0aGUgTGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBiYXNlbGluZSBmb3IgdGhlIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUcnVuY2F0ZSBsYWJlbHMgdGhhdCBhcmUgdG9vIGxvbmcuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIGFuZCBkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInN1YmRpdmlkZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHByb3ZpZGVkLCBzZXRzIHRoZSBudW1iZXIgb2YgbWlub3IgdGlja3MgYmV0d2VlbiBtYWpvciB0aWNrcyAodGhlIHZhbHVlIDkgcmVzdWx0cyBpbiBkZWNpbWFsIHN1YmRpdmlzaW9uKS4gT25seSBhcHBsaWNhYmxlIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZGVzaXJlZCBudW1iZXIgb2YgdGlja3MsIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuIFRoZSByZXN1bHRpbmcgbnVtYmVyIG1heSBiZSBkaWZmZXJlbnQgc28gdGhhdCB2YWx1ZXMgYXJlIFxcXCJuaWNlXFxcIiAobXVsdGlwbGVzIG9mIDIsIDUsIDEwKSBhbmQgbGllIHdpdGhpbiB0aGUgdW5kZXJseWluZyBzY2FsZSdzIHJhbmdlLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBheGlzJ3MgdGljay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSB0aWNrIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSB0aWNrIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIGxhYmVsLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrUGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwYWRkaW5nLCBpbiBwaXhlbHMsIGJldHdlZW4gdGlja3MgYW5kIHRleHQgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciwgbWlub3IgYW5kIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWFqb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWlub3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtaW5vciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplRW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoLCBpbiBwaXhlbHMsIG9mIHRpY2tzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvbnQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2VpZ2h0IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBvZmZzZXQgdmFsdWUgZm9yIHRoZSBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXggbGVuZ3RoIGZvciBheGlzIHRpdGxlIGlmIHRoZSB0aXRsZSBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBmcm9tIHRoZSBmaWVsZCdzIGRlc2NyaXB0aW9uLiBCeSBkZWZhdWx0LCB0aGlzIGlzIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gY2VsbCBzaXplIGFuZCBjaGFyYWN0ZXJXaWR0aCBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNoYXJhY3RlcldpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2hhcmFjdGVyIHdpZHRoIGZvciBhdXRvbWF0aWNhbGx5IGRldGVybWluaW5nIHRpdGxlIG1heCBsZW5ndGguXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGF4aXMgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkF4aXNPcmllbnRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInRvcFwiLFxuICAgICAgICBcInJpZ2h0XCIsXG4gICAgICAgIFwibGVmdFwiLFxuICAgICAgICBcImJvdHRvbVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNjYWxlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlVHlwZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGRvbWFpbiBvZiB0aGUgc2NhbGUsIHJlcHJlc2VudGluZyB0aGUgc2V0IG9mIGRhdGEgdmFsdWVzLiBGb3IgcXVhbnRpdGF0aXZlIGRhdGEsIHRoaXMgY2FuIHRha2UgdGhlIGZvcm0gb2YgYSB0d28tZWxlbWVudCBhcnJheSB3aXRoIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzLiBGb3Igb3JkaW5hbC9jYXRlZ29yaWNhbCBkYXRhLCB0aGlzIG1heSBiZSBhbiBhcnJheSBvZiB2YWxpZCBpbnB1dCB2YWx1ZXMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwicmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcmFuZ2Ugb2YgdGhlIHNjYWxlLCByZXByZXNlbnRpbmcgdGhlIHNldCBvZiB2aXN1YWwgdmFsdWVzLiBGb3IgbnVtZXJpYyB2YWx1ZXMsIHRoZSByYW5nZSBjYW4gdGFrZSB0aGUgZm9ybSBvZiBhIHR3by1lbGVtZW50IGFycmF5IHdpdGggbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZXMuIEZvciBvcmRpbmFsIG9yIHF1YW50aXplZCBkYXRhLCB0aGUgcmFuZ2UgbWF5IGJ5IGFuIGFycmF5IG9mIGRlc2lyZWQgb3V0cHV0IHZhbHVlcywgd2hpY2ggYXJlIG1hcHBlZCB0byBlbGVtZW50cyBpbiB0aGUgc3BlY2lmaWVkIGRvbWFpbi4gRm9yIG9yZGluYWwgc2NhbGVzIG9ubHksIHRoZSByYW5nZSBjYW4gYmUgZGVmaW5lZCB1c2luZyBhIERhdGFSZWY6IHRoZSByYW5nZSB2YWx1ZXMgYXJlIHRoZW4gZHJhd24gZHluYW1pY2FsbHkgZnJvbSBhIGJhY2tpbmcgZGF0YSBzZXQuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInJvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgcm91bmRzIG51bWVyaWMgb3V0cHV0IHZhbHVlcyB0byBpbnRlZ2Vycy4gVGhpcyBjYW4gYmUgaGVscGZ1bCBmb3Igc25hcHBpbmcgdG8gdGhlIHBpeGVsIGdyaWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFuZFNpemVcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFwcGxpZXMgc3BhY2luZyBhbW9uZyBvcmRpbmFsIGVsZW1lbnRzIGluIHRoZSBzY2FsZSByYW5nZS4gVGhlIGFjdHVhbCBlZmZlY3QgZGVwZW5kcyBvbiBob3cgdGhlIHNjYWxlIGlzIGNvbmZpZ3VyZWQuIElmIHRoZSBfX3BvaW50c19fIHBhcmFtZXRlciBpcyBgdHJ1ZWAsIHRoZSBwYWRkaW5nIHZhbHVlIGlzIGludGVycHJldGVkIGFzIGEgbXVsdGlwbGUgb2YgdGhlIHNwYWNpbmcgYmV0d2VlbiBwb2ludHMuIEEgcmVhc29uYWJsZSB2YWx1ZSBpcyAxLjAsIHN1Y2ggdGhhdCB0aGUgZmlyc3QgYW5kIGxhc3QgcG9pbnQgd2lsbCBiZSBvZmZzZXQgZnJvbSB0aGUgbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZSBieSBoYWxmIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHBvaW50cy4gT3RoZXJ3aXNlLCBwYWRkaW5nIGlzIHR5cGljYWxseSBpbiB0aGUgcmFuZ2UgWzAsIDFdIGFuZCBjb3JyZXNwb25kcyB0byB0aGUgZnJhY3Rpb24gb2Ygc3BhY2UgaW4gdGhlIHJhbmdlIGludGVydmFsIHRvIGFsbG9jYXRlIHRvIHBhZGRpbmcuIEEgdmFsdWUgb2YgMC41IG1lYW5zIHRoYXQgdGhlIHJhbmdlIGJhbmQgd2lkdGggd2lsbCBiZSBlcXVhbCB0byB0aGUgcGFkZGluZyB3aWR0aC4gRm9yIG1vcmUsIHNlZSB0aGUgW0QzIG9yZGluYWwgc2NhbGUgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL21ib3N0b2NrL2QzL3dpa2kvT3JkaW5hbC1TY2FsZXMpLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2xhbXBcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiB0cnVlLCB2YWx1ZXMgdGhhdCBleGNlZWQgdGhlIGRhdGEgZG9tYWluIGFyZSBjbGFtcGVkIHRvIGVpdGhlciB0aGUgbWluaW11bSBvciBtYXhpbXVtIHJhbmdlIHZhbHVlXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibmljZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHNwZWNpZmllZCwgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IHZhbHVlIHJhbmdlLiBJZiBzcGVjaWZpZWQgYXMgYSB0cnVlIGJvb2xlYW4sIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSBudW1iZXIgcmFuZ2UgKGUuZy4sIDcgaW5zdGVhZCBvZiA2Ljk2KS4gSWYgc3BlY2lmaWVkIGFzIGEgc3RyaW5nLCBtb2RpZmllcyB0aGUgc2NhbGUgZG9tYWluIHRvIHVzZSBhIG1vcmUgaHVtYW4tZnJpZW5kbHkgdmFsdWUgcmFuZ2UuIEZvciB0aW1lIGFuZCB1dGMgc2NhbGUgdHlwZXMgb25seSwgdGhlIG5pY2UgdmFsdWUgc2hvdWxkIGJlIGEgc3RyaW5nIGluZGljYXRpbmcgdGhlIGRlc2lyZWQgdGltZSBpbnRlcnZhbC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL05pY2VUaW1lXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZXhwb25lbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTZXRzIHRoZSBleHBvbmVudCBvZiB0aGUgc2NhbGUgdHJhbnNmb3JtYXRpb24uIEZvciBwb3cgc2NhbGUgdHlwZXMgb25seSwgb3RoZXJ3aXNlIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ6ZXJvXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgYHRydWVgLCBlbnN1cmVzIHRoYXQgYSB6ZXJvIGJhc2VsaW5lIHZhbHVlIGlzIGluY2x1ZGVkIGluIHRoZSBzY2FsZSBkb21haW4uXFxuXFxuRGVmYXVsdCB2YWx1ZTogYHRydWVgIGZvciBgeGAgYW5kIGB5YCBjaGFubmVsIGlmIHRoZSBxdWFudGl0YXRpdmUgZmllbGQgaXMgbm90IGJpbm5lZFxcblxcbmFuZCBubyBjdXN0b20gYGRvbWFpbmAgaXMgcHJvdmlkZWQ7IGBmYWxzZWAgb3RoZXJ3aXNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInVzZVJhd0RvbWFpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlVzZXMgdGhlIHNvdXJjZSBkYXRhIHJhbmdlIGFzIHNjYWxlIGRvbWFpbiBpbnN0ZWFkIG9mIGFnZ3JlZ2F0ZWQgZGF0YSBmb3IgYWdncmVnYXRlIGF4aXMuXFxuXFxuVGhpcyBwcm9wZXJ0eSBvbmx5IHdvcmtzIHdpdGggYWdncmVnYXRlIGZ1bmN0aW9ucyB0aGF0IHByb2R1Y2UgdmFsdWVzIHdpdGhpbiB0aGUgcmF3IGRhdGEgZG9tYWluIChgXFxcIm1lYW5cXFwiYCwgYFxcXCJhdmVyYWdlXFxcImAsIGBcXFwic3RkZXZcXFwiYCwgYFxcXCJzdGRldnBcXFwiYCwgYFxcXCJtZWRpYW5cXFwiYCwgYFxcXCJxMVxcXCJgLCBgXFxcInEzXFxcImAsIGBcXFwibWluXFxcImAsIGBcXFwibWF4XFxcImApLiBGb3Igb3RoZXIgYWdncmVnYXRpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgb3V0c2lkZSBvZiB0aGUgcmF3IGRhdGEgZG9tYWluIChlLmcuIGBcXFwiY291bnRcXFwiYCwgYFxcXCJzdW1cXFwiYCksIHRoaXMgcHJvcGVydHkgaXMgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJTY2FsZVR5cGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxpbmVhclwiLFxuICAgICAgICBcImxvZ1wiLFxuICAgICAgICBcInBvd1wiLFxuICAgICAgICBcInNxcnRcIixcbiAgICAgICAgXCJxdWFudGlsZVwiLFxuICAgICAgICBcInF1YW50aXplXCIsXG4gICAgICAgIFwib3JkaW5hbFwiLFxuICAgICAgICBcInRpbWVcIixcbiAgICAgICAgXCJ1dGNcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJOaWNlVGltZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwic2Vjb25kXCIsXG4gICAgICAgIFwibWludXRlXCIsXG4gICAgICAgIFwiaG91clwiLFxuICAgICAgICBcImRheVwiLFxuICAgICAgICBcIndlZWtcIixcbiAgICAgICAgXCJtb250aFwiLFxuICAgICAgICBcInllYXJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTb3J0RmllbGRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZpZWxkIG5hbWUgdG8gYWdncmVnYXRlIG92ZXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc29ydCBhZ2dyZWdhdGlvbiBvcGVyYXRvclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JkZXJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwib3BcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJBZ2dyZWdhdGVPcFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwidmFsdWVzXCIsXG4gICAgICAgIFwiY291bnRcIixcbiAgICAgICAgXCJ2YWxpZFwiLFxuICAgICAgICBcIm1pc3NpbmdcIixcbiAgICAgICAgXCJkaXN0aW5jdFwiLFxuICAgICAgICBcInN1bVwiLFxuICAgICAgICBcIm1lYW5cIixcbiAgICAgICAgXCJhdmVyYWdlXCIsXG4gICAgICAgIFwidmFyaWFuY2VcIixcbiAgICAgICAgXCJ2YXJpYW5jZXBcIixcbiAgICAgICAgXCJzdGRldlwiLFxuICAgICAgICBcInN0ZGV2cFwiLFxuICAgICAgICBcIm1lZGlhblwiLFxuICAgICAgICBcInExXCIsXG4gICAgICAgIFwicTNcIixcbiAgICAgICAgXCJtb2Rlc2tld1wiLFxuICAgICAgICBcIm1pblwiLFxuICAgICAgICBcIm1heFwiLFxuICAgICAgICBcImFyZ21pblwiLFxuICAgICAgICBcImFyZ21heFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNvcnRPcmRlclwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiYXNjZW5kaW5nXCIsXG4gICAgICAgIFwiZGVzY2VuZGluZ1wiLFxuICAgICAgICBcIm5vbmVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJUeXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJxdWFudGl0YXRpdmVcIixcbiAgICAgICAgXCJvcmRpbmFsXCIsXG4gICAgICAgIFwidGVtcG9yYWxcIixcbiAgICAgICAgXCJub21pbmFsXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVGltZVVuaXRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInllYXJcIixcbiAgICAgICAgXCJtb250aFwiLFxuICAgICAgICBcImRheVwiLFxuICAgICAgICBcImRhdGVcIixcbiAgICAgICAgXCJob3Vyc1wiLFxuICAgICAgICBcIm1pbnV0ZXNcIixcbiAgICAgICAgXCJzZWNvbmRzXCIsXG4gICAgICAgIFwibWlsbGlzZWNvbmRzXCIsXG4gICAgICAgIFwieWVhcm1vbnRoXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZVwiLFxuICAgICAgICBcInllYXJtb250aGRhdGVob3Vyc1wiLFxuICAgICAgICBcInllYXJtb250aGRhdGVob3Vyc21pbnV0ZXNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzc2Vjb25kc1wiLFxuICAgICAgICBcImhvdXJzbWludXRlc1wiLFxuICAgICAgICBcImhvdXJzbWludXRlc3NlY29uZHNcIixcbiAgICAgICAgXCJtaW51dGVzc2Vjb25kc1wiLFxuICAgICAgICBcInNlY29uZHNtaWxsaXNlY29uZHNcIixcbiAgICAgICAgXCJxdWFydGVyXCIsXG4gICAgICAgIFwieWVhcnF1YXJ0ZXJcIixcbiAgICAgICAgXCJxdWFydGVybW9udGhcIixcbiAgICAgICAgXCJ5ZWFycXVhcnRlcm1vbnRoXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiQmluXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJtaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWluaW11bSBiaW4gdmFsdWUgdG8gY29uc2lkZXIuIElmIHVuc3BlY2lmaWVkLCB0aGUgbWluaW11bSB2YWx1ZSBvZiB0aGUgc3BlY2lmaWVkIGZpZWxkIGlzIHVzZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWF4aW11bSBiaW4gdmFsdWUgdG8gY29uc2lkZXIuIElmIHVuc3BlY2lmaWVkLCB0aGUgbWF4aW11bSB2YWx1ZSBvZiB0aGUgc3BlY2lmaWVkIGZpZWxkIGlzIHVzZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXNlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG51bWJlciBiYXNlIHRvIHVzZSBmb3IgYXV0b21hdGljIGJpbiBkZXRlcm1pbmF0aW9uIChkZWZhdWx0IGlzIGJhc2UgMTApLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RlcFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGV4YWN0IHN0ZXAgc2l6ZSB0byB1c2UgYmV0d2VlbiBiaW5zLiBJZiBwcm92aWRlZCwgb3B0aW9ucyBzdWNoIGFzIG1heGJpbnMgd2lsbCBiZSBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RlcHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBhcnJheSBvZiBhbGxvd2FibGUgc3RlcCBzaXplcyB0byBjaG9vc2UgZnJvbS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibWluc3RlcFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgbWluaW11bSBhbGxvd2FibGUgc3RlcCBzaXplIChwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBpbnRlZ2VyIHZhbHVlcykuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkaXZcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTY2FsZSBmYWN0b3JzIGluZGljYXRpbmcgYWxsb3dhYmxlIHN1YmRpdmlzaW9ucy4gVGhlIGRlZmF1bHQgdmFsdWUgaXMgWzUsIDJdLCB3aGljaCBpbmRpY2F0ZXMgdGhhdCBmb3IgYmFzZSAxMCBudW1iZXJzICh0aGUgZGVmYXVsdCBiYXNlKSwgdGhlIG1ldGhvZCBtYXkgY29uc2lkZXIgZGl2aWRpbmcgYmluIHNpemVzIGJ5IDUgYW5kL29yIDIuIEZvciBleGFtcGxlLCBmb3IgYW4gaW5pdGlhbCBzdGVwIHNpemUgb2YgMTAsIHRoZSBtZXRob2QgY2FuIGNoZWNrIGlmIGJpbiBzaXplcyBvZiAyICg9IDEwLzUpLCA1ICg9IDEwLzIpLCBvciAxICg9IDEwLyg1KjIpKSBtaWdodCBhbHNvIHNhdGlzZnkgdGhlIGdpdmVuIGNvbnN0cmFpbnRzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXhiaW5zXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWF4aW11bSBudW1iZXIgb2YgYmlucy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkNoYW5uZWxEZWZXaXRoTGVnZW5kXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsZWdlbmRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTGVnZW5kXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzY2FsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TY2FsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic29ydFwiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydEZpZWxkXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSBmaWVsZCBmcm9tIHdoaWNoIHRvIHB1bGwgYSBkYXRhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBlbmNvZGVkIGZpZWxkJ3MgdHlwZSBvZiBtZWFzdXJlbWVudC4gVGhpcyBjYW4gYmUgZWl0aGVyIGEgZnVsbCB0eXBlXFxuXFxubmFtZSAoYFxcXCJxdWFudGl0YXRpdmVcXFwiYCwgYFxcXCJ0ZW1wb3JhbFxcXCJgLCBgXFxcIm9yZGluYWxcXFwiYCwgIGFuZCBgXFxcIm5vbWluYWxcXFwiYClcXG5cXG5vciBhbiBpbml0aWFsIGNoYXJhY3RlciBvZiB0aGUgdHlwZSBuYW1lIChgXFxcIlFcXFwiYCwgYFxcXCJUXFxcImAsIGBcXFwiT1xcXCJgLCBgXFxcIk5cXFwiYCkuXFxuXFxuVGhpcyBwcm9wZXJ0eSBpcyBjYXNlIGluc2Vuc2l0aXZlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbnN0YW50IHZhbHVlIGluIHZpc3VhbCBkb21haW4uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgYSBgdGVtcG9yYWxgIGZpZWxkICAoZS5nLiwgYHllYXJgLCBgeWVhcm1vbnRoYCwgYG1vbnRoYCwgYGhvdXJgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZsYWcgZm9yIGJpbm5pbmcgYSBgcXVhbnRpdGF0aXZlYCBmaWVsZCwgb3IgYSBiaW4gcHJvcGVydHkgb2JqZWN0XFxuXFxuZm9yIGJpbm5pbmcgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0JpblwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQmlubmluZyBwcm9wZXJ0aWVzIG9yIGJvb2xlYW4gZmxhZyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0byBiaW4gZGF0YSBvciBub3QuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWdncmVnYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIGZvciB0aGUgZmllbGRcXG5cXG4oZS5nLiwgYG1lYW5gLCBgc3VtYCwgYG1lZGlhbmAsIGBtaW5gLCBgbWF4YCwgYGNvdW50YCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpdGxlIGZvciBheGlzIG9yIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkxlZ2VuZFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZm9ybWF0dGluZyBwYXR0ZXJuIGZvciBsZWdlbmQgbGFiZWxzLiBWZWdhIHVzZXMgRDNcXFxcJ3MgZm9ybWF0IHBhdHRlcm4uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgdGl0bGUgZm9yIHRoZSBsZWdlbmQuIChTaG93cyBmaWVsZCBuYW1lIGFuZCBpdHMgZnVuY3Rpb24gYnkgZGVmYXVsdC4pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJFeHBsaWNpdGx5IHNldCB0aGUgdmlzaWJsZSBsZWdlbmQgdmFsdWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICBcIm9yaWVudFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvcmllbnRhdGlvbiBvZiB0aGUgbGVnZW5kLiBPbmUgb2YgXFxcImxlZnRcXFwiIG9yIFxcXCJyaWdodFxcXCIuIFRoaXMgZGV0ZXJtaW5lcyBob3cgdGhlIGxlZ2VuZCBpcyBwb3NpdGlvbmVkIHdpdGhpbiB0aGUgc2NlbmUuIFRoZSBkZWZhdWx0IGlzIFxcXCJyaWdodFxcXCIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0LCBpbiBwaXhlbHMsIGJ5IHdoaWNoIHRvIGRpc3BsYWNlIHRoZSBsZWdlbmQgZnJvbSB0aGUgZWRnZSBvZiB0aGUgZW5jbG9zaW5nIGdyb3VwIG9yIGRhdGEgcmVjdGFuZ2xlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwYWRkaW5nLCBpbiBwaXhlbHMsIGJldHdlZW4gdGhlIGxlbmdlbmQgYW5kIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXJnaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyZ2luIGFyb3VuZCB0aGUgbGVnZW5kLCBpbiBwaXhlbHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50U3Ryb2tlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGdyYWRpZW50IHN0cm9rZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50U3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50IHN0cm9rZSwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRIZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgaGVpZ2h0IG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQWxpZ25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgYWxpZ25tZW50IG9mIHRoZSBsZWdlbmQgbGFiZWwsIGNhbiBiZSBsZWZ0LCBtaWRkbGUgb3IgcmlnaHQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBvc2l0aW9uIG9mIHRoZSBiYXNlbGluZSBvZiBsZWdlbmQgbGFiZWwsIGNhbiBiZSB0b3AsIG1pZGRsZSBvciBib3R0b20uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgbGVuZ2VuZCBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIGxlbmdlbmQgbGFibGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgb2YgdGhlIGxlZ2VuZCBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggbmFtZXMgYW5kIHdlZWtkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgc3ltYm9sLFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU2hhcGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2hhcGUgb2YgdGhlIGxlZ2VuZCBzeW1ib2wsIGNhbiBiZSB0aGUgJ2NpcmNsZScsICdzcXVhcmUnLCAnY3Jvc3MnLCAnZGlhbW9uZCcsXFxuXFxuJ3RyaWFuZ2xlLXVwJywgJ3RyaWFuZ2xlLWRvd24nLCBvciBlbHNlIGEgY3VzdG9tIFNWRyBwYXRoIHN0cmluZy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgbGVuZ2VuZCBzeW1ib2wsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBzeW1ib2wncyBzdHJva2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlxcblxcblRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCB3ZWlnaHQgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGaWVsZERlZlwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSBmaWVsZCBmcm9tIHdoaWNoIHRvIHB1bGwgYSBkYXRhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBlbmNvZGVkIGZpZWxkJ3MgdHlwZSBvZiBtZWFzdXJlbWVudC4gVGhpcyBjYW4gYmUgZWl0aGVyIGEgZnVsbCB0eXBlXFxuXFxubmFtZSAoYFxcXCJxdWFudGl0YXRpdmVcXFwiYCwgYFxcXCJ0ZW1wb3JhbFxcXCJgLCBgXFxcIm9yZGluYWxcXFwiYCwgIGFuZCBgXFxcIm5vbWluYWxcXFwiYClcXG5cXG5vciBhbiBpbml0aWFsIGNoYXJhY3RlciBvZiB0aGUgdHlwZSBuYW1lIChgXFxcIlFcXFwiYCwgYFxcXCJUXFxcImAsIGBcXFwiT1xcXCJgLCBgXFxcIk5cXFwiYCkuXFxuXFxuVGhpcyBwcm9wZXJ0eSBpcyBjYXNlIGluc2Vuc2l0aXZlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbnN0YW50IHZhbHVlIGluIHZpc3VhbCBkb21haW4uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgYSBgdGVtcG9yYWxgIGZpZWxkICAoZS5nLiwgYHllYXJgLCBgeWVhcm1vbnRoYCwgYG1vbnRoYCwgYGhvdXJgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZsYWcgZm9yIGJpbm5pbmcgYSBgcXVhbnRpdGF0aXZlYCBmaWVsZCwgb3IgYSBiaW4gcHJvcGVydHkgb2JqZWN0XFxuXFxuZm9yIGJpbm5pbmcgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0JpblwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQmlubmluZyBwcm9wZXJ0aWVzIG9yIGJvb2xlYW4gZmxhZyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0byBiaW4gZGF0YSBvciBub3QuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWdncmVnYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIGZvciB0aGUgZmllbGRcXG5cXG4oZS5nLiwgYG1lYW5gLCBgc3VtYCwgYG1lZGlhbmAsIGBtaW5gLCBgbWF4YCwgYGNvdW50YCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpdGxlIGZvciBheGlzIG9yIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIk9yZGVyQ2hhbm5lbERlZlwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwic29ydFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJEYXRhXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YUZvcm1hdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgdGhlIGZvcm1hdCBmb3IgdGhlIGRhdGEgZmlsZSBvciB2YWx1ZXMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ1cmxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIFVSTCBmcm9tIHdoaWNoIHRvIGxvYWQgdGhlIGRhdGEgc2V0LiBVc2UgdGhlIGZvcm1hdC50eXBlIHByb3BlcnR5XFxuXFxudG8gZW5zdXJlIHRoZSBsb2FkZWQgZGF0YSBpcyBjb3JyZWN0bHkgcGFyc2VkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGFzcyBhcnJheSBvZiBvYmplY3RzIGluc3RlYWQgb2YgYSB1cmwgdG8gYSBmaWxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7fVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkRhdGFGb3JtYXRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YUZvcm1hdFR5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHlwZSBvZiBpbnB1dCBkYXRhOiBgXFxcImpzb25cXFwiYCwgYFxcXCJjc3ZcXFwiYCwgYFxcXCJ0c3ZcXFwiYC5cXG5cXG5UaGUgZGVmYXVsdCBmb3JtYXQgdHlwZSBpcyBkZXRlcm1pbmVkIGJ5IHRoZSBleHRlbnNpb24gb2YgdGhlIGZpbGUgdXJsLlxcblxcbklmIG5vIGV4dGVuc2lvbiBpcyBkZXRlY3RlZCwgYFxcXCJqc29uXFxcImAgd2lsbCBiZSB1c2VkIGJ5IGRlZmF1bHQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkpTT04gb25seSkgVGhlIEpTT04gcHJvcGVydHkgY29udGFpbmluZyB0aGUgZGVzaXJlZCBkYXRhLlxcblxcblRoaXMgcGFyYW1ldGVyIGNhbiBiZSB1c2VkIHdoZW4gdGhlIGxvYWRlZCBKU09OIGZpbGUgbWF5IGhhdmUgc3Vycm91bmRpbmcgc3RydWN0dXJlIG9yIG1ldGEtZGF0YS5cXG5cXG5Gb3IgZXhhbXBsZSBgXFxcInByb3BlcnR5XFxcIjogXFxcInZhbHVlcy5mZWF0dXJlc1xcXCJgIGlzIGVxdWl2YWxlbnQgdG8gcmV0cmlldmluZyBganNvbi52YWx1ZXMuZmVhdHVyZXNgXFxuXFxuZnJvbSB0aGUgbG9hZGVkIEpTT04gb2JqZWN0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmVhdHVyZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBuYW1lIG9mIHRoZSBUb3BvSlNPTiBvYmplY3Qgc2V0IHRvIGNvbnZlcnQgdG8gYSBHZW9KU09OIGZlYXR1cmUgY29sbGVjdGlvbi5cXG5cXG5Gb3IgZXhhbXBsZSwgaW4gYSBtYXAgb2YgdGhlIHdvcmxkLCB0aGVyZSBtYXkgYmUgYW4gb2JqZWN0IHNldCBuYW1lZCBgXFxcImNvdW50cmllc1xcXCJgLlxcblxcblVzaW5nIHRoZSBmZWF0dXJlIHByb3BlcnR5LCB3ZSBjYW4gZXh0cmFjdCB0aGlzIHNldCBhbmQgZ2VuZXJhdGUgYSBHZW9KU09OIGZlYXR1cmUgb2JqZWN0IGZvciBlYWNoIGNvdW50cnkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG5hbWUgb2YgdGhlIFRvcG9KU09OIG9iamVjdCBzZXQgdG8gY29udmVydCB0byBhIG1lc2guXFxuXFxuU2ltaWxhciB0byB0aGUgYGZlYXR1cmVgIG9wdGlvbiwgYG1lc2hgIGV4dHJhY3RzIGEgbmFtZWQgVG9wb0pTT04gb2JqZWN0IHNldC5cXG5cXG5Vbmxpa2UgdGhlIGBmZWF0dXJlYCBvcHRpb24sIHRoZSBjb3JyZXNwb25kaW5nIGdlbyBkYXRhIGlzIHJldHVybmVkIGFzIGEgc2luZ2xlLCB1bmlmaWVkIG1lc2ggaW5zdGFuY2UsIG5vdCBhcyBpbmlkaXZpZHVhbCBHZW9KU09OIGZlYXR1cmVzLlxcblxcbkV4dHJhY3RpbmcgYSBtZXNoIGlzIHVzZWZ1bCBmb3IgbW9yZSBlZmZpY2llbnRseSBkcmF3aW5nIGJvcmRlcnMgb3Igb3RoZXIgZ2VvZ3JhcGhpYyBlbGVtZW50cyB0aGF0IHlvdSBkbyBub3QgbmVlZCB0byBhc3NvY2lhdGUgd2l0aCBzcGVjaWZpYyByZWdpb25zIHN1Y2ggYXMgaW5kaXZpZHVhbCBjb3VudHJpZXMsIHN0YXRlcyBvciBjb3VudGllcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkRhdGFGb3JtYXRUeXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJqc29uXCIsXG4gICAgICAgIFwiY3N2XCIsXG4gICAgICAgIFwidHN2XCIsXG4gICAgICAgIFwidG9wb2pzb25cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJUcmFuc2Zvcm1cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpbHRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIGZpbHRlciBWZWdhIGV4cHJlc3Npb24uIFVzZSBgZGF0dW1gIHRvIHJlZmVyIHRvIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0LlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FcXVhbEZpbHRlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1JhbmdlRmlsdGVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSW5GaWx0ZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0VxdWFsRmlsdGVyXCJcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUmFuZ2VGaWx0ZXJcIlxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9JbkZpbHRlclwiXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImZpbHRlckludmFsaWRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIHRvIGZpbHRlciBpbnZhbGlkIHZhbHVlcyAoYG51bGxgIGFuZCBgTmFOYCkgZnJvbSB0aGUgZGF0YS4gQnkgZGVmYXVsdCAoYHVuZGVmaW5lZGApLCBvbmx5IHF1YW50aXRhdGl2ZSBhbmQgdGVtcG9yYWwgZmllbGRzIGFyZSBmaWx0ZXJlZC4gSWYgc2V0IHRvIGB0cnVlYCwgYWxsIGRhdGEgaXRlbXMgd2l0aCBudWxsIHZhbHVlcyBhcmUgZmlsdGVyZWQuIElmIGBmYWxzZWAsIGFsbCBkYXRhIGl0ZW1zIGFyZSBpbmNsdWRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjYWxjdWxhdGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDYWxjdWxhdGUgbmV3IGZpZWxkKHMpIHVzaW5nIHRoZSBwcm92aWRlZCBleHByZXNzc2lvbihzKS4gQ2FsY3VsYXRpb24gYXJlIGFwcGxpZWQgYmVmb3JlIGZpbHRlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Gb3JtdWxhXCIsXG4gICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRm9ybXVsYSBvYmplY3QgZm9yIGNhbGN1bGF0ZS5cIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJFcXVhbEZpbHRlclwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciB0aGUgZmllbGQgdG8gYmUgZmlsdGVyZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZpZWxkIHRvIGJlIGZpbHRlcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZXF1YWxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJWYWx1ZSB0aGF0IHRoZSBmaWVsZCBzaG91bGQgYmUgZXF1YWwgdG8uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGVUaW1lXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPYmplY3QgZm9yIGRlZmluaW5nIGRhdGV0aW1lIGluIFZlZ2EtTGl0ZSBGaWx0ZXIuXFxuXFxuSWYgYm90aCBtb250aCBhbmQgcXVhcnRlciBhcmUgcHJvdmlkZWQsIG1vbnRoIGhhcyBoaWdoZXIgcHJlY2VkZW5jZS5cXG5cXG5gZGF5YCBjYW5ub3QgYmUgY29tYmluZWQgd2l0aCBvdGhlciBkYXRlLlxcblxcbldlIGFjY2VwdCBzdHJpbmcgZm9yIG1vbnRoIGFuZCBkYXkgbmFtZXMuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcImVxdWFsXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRGF0ZVRpbWVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInllYXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyB0aGUgeWVhci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInF1YXJ0ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyB0aGUgcXVhcnRlciBvZiB0aGUgeWVhciAoZnJvbSAxLTQpLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibW9udGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPbmUgb2Y6ICgxKSBpbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyB0aGUgbW9udGggZnJvbSBgMWAtYDEyYC4gYDFgIHJlcHJlc2VudHMgSmFudWFyeTsgICgyKSBjYXNlLWluc2Vuc2l0aXZlIG1vbnRoIG5hbWUgKGUuZy4sIGBcXFwiSmFudWFyeVxcXCJgKTsgICgzKSBjYXNlLWluc2Vuc2l0aXZlLCAzLWNoYXJhY3RlciBzaG9ydCBtb250aCBuYW1lIChlLmcuLCBgXFxcIkphblxcXCJgKS5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImRhdGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyB0aGUgZGF0ZSBmcm9tIDEtMzEuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJWYWx1ZSByZXByZXNlbnRpbmcgdGhlIGRheSBvZiB3ZWVrLiAgVGhpcyBjYW4gYmUgb25lIG9mOiAoMSkgaW50ZWdlciB2YWx1ZSAtLSBgMWAgcmVwcmVzZW50cyBNb25kYXk7ICgyKSBjYXNlLWluc2Vuc2l0aXZlIGRheSBuYW1lIChlLmcuLCBgXFxcIk1vbmRheVxcXCJgKTsgICgzKSBjYXNlLWluc2Vuc2l0aXZlLCAzLWNoYXJhY3RlciBzaG9ydCBkYXkgbmFtZSAoZS5nLiwgYFxcXCJNb25cXFwiYCkuICAgPGJyLz4gKipXYXJuaW5nOioqIEEgRGF0ZVRpbWUgZGVmaW5pdGlvbiBvYmplY3Qgd2l0aCBgZGF5YCoqIHNob3VsZCBub3QgYmUgY29tYmluZWQgd2l0aCBgeWVhcmAsIGBxdWFydGVyYCwgYG1vbnRoYCwgb3IgYGRhdGVgLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiaG91cnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyB0aGUgaG91ciBvZiBkYXkgZnJvbSAwLTIzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWludXRlc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIG1pbnV0ZSBzZWdtZW50IG9mIGEgdGltZSBmcm9tIDAtNTkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZWNvbmRzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgc2Vjb25kIHNlZ21lbnQgb2YgYSB0aW1lIGZyb20gMC01OS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1pbGxpc2Vjb25kc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIG1pbGxpc2Vjb25kIHNlZ21lbnQgb2YgYSB0aW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiUmFuZ2VGaWx0ZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcInRpbWUgdW5pdCBmb3IgdGhlIGZpZWxkIHRvIGJlIGZpbHRlcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGaWVsZCB0byBiZSBmaWx0ZXJlZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwicmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBcnJheSBvZiBpbmNsdXNpdmUgbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZXNcXG5cXG5mb3IgYSBmaWVsZCB2YWx1ZSBvZiBhIGRhdGEgaXRlbSB0byBiZSBpbmNsdWRlZCBpbiB0aGUgZmlsdGVyZWQgZGF0YS5cIixcbiAgICAgICAgICBcIm1heEl0ZW1zXCI6IDIsXG4gICAgICAgICAgXCJtaW5JdGVtc1wiOiAyLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGVUaW1lXCIsXG4gICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9iamVjdCBmb3IgZGVmaW5pbmcgZGF0ZXRpbWUgaW4gVmVnYS1MaXRlIEZpbHRlci5cXG5cXG5JZiBib3RoIG1vbnRoIGFuZCBxdWFydGVyIGFyZSBwcm92aWRlZCwgbW9udGggaGFzIGhpZ2hlciBwcmVjZWRlbmNlLlxcblxcbmBkYXlgIGNhbm5vdCBiZSBjb21iaW5lZCB3aXRoIG90aGVyIGRhdGUuXFxuXFxuV2UgYWNjZXB0IHN0cmluZyBmb3IgbW9udGggYW5kIGRheSBuYW1lcy5cIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJyYW5nZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkluRmlsdGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJ0aW1lIHVuaXQgZm9yIHRoZSBmaWVsZCB0byBiZSBmaWx0ZXJlZC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmllbGQgdG8gYmUgZmlsdGVyZWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzZXQgb2YgdmFsdWVzIHRoYXQgdGhlIGBmaWVsZGAncyB2YWx1ZSBzaG91bGQgYmUgYSBtZW1iZXIgb2YsXFxuXFxuZm9yIGEgZGF0YSBpdGVtIGluY2x1ZGVkIGluIHRoZSBmaWx0ZXJlZCBkYXRhLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGVUaW1lXCIsXG4gICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9iamVjdCBmb3IgZGVmaW5pbmcgZGF0ZXRpbWUgaW4gVmVnYS1MaXRlIEZpbHRlci5cXG5cXG5JZiBib3RoIG1vbnRoIGFuZCBxdWFydGVyIGFyZSBwcm92aWRlZCwgbW9udGggaGFzIGhpZ2hlciBwcmVjZWRlbmNlLlxcblxcbmBkYXlgIGNhbm5vdCBiZSBjb21iaW5lZCB3aXRoIG90aGVyIGRhdGUuXFxuXFxuV2UgYWNjZXB0IHN0cmluZyBmb3IgbW9udGggYW5kIGRheSBuYW1lcy5cIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJpblwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZvcm11bGFcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZpZWxkIGluIHdoaWNoIHRvIHN0b3JlIHRoZSBjb21wdXRlZCBmb3JtdWxhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZXhwclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGNvbnRhaW5pbmcgYW4gZXhwcmVzc2lvbiBmb3IgdGhlIGZvcm11bGEuIFVzZSB0aGUgdmFyaWFibGUgYGRhdHVtYCB0byB0byByZWZlciB0byB0aGUgY3VycmVudCBkYXRhIG9iamVjdC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJleHByXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ2aWV3cG9ydFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBvbi1zY3JlZW4gdmlld3BvcnQsIGluIHBpeGVscy4gSWYgbmVjZXNzYXJ5LCBjbGlwcGluZyBhbmQgc2Nyb2xsaW5nIHdpbGwgYmUgYXBwbGllZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhY2tncm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDU1MgY29sb3IgcHJvcGVydHkgdG8gdXNlIGFzIGJhY2tncm91bmQgb2YgdmlzdWFsaXphdGlvbi4gRGVmYXVsdCBpcyBgXFxcInRyYW5zcGFyZW50XFxcImAuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJudW1iZXJGb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEMyBOdW1iZXIgZm9ybWF0IGZvciBheGlzIGxhYmVscyBhbmQgdGV4dCB0YWJsZXMuIEZvciBleGFtcGxlIFxcXCJzXFxcIiBmb3IgU0kgdW5pdHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lRm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBkYXRldGltZSBmb3JtYXQgZm9yIGF4aXMgYW5kIGxlZ2VuZCBsYWJlbHMuIFRoZSBmb3JtYXQgY2FuIGJlIHNldCBkaXJlY3RseSBvbiBlYWNoIGF4aXMgYW5kIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvdW50VGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGF4aXMgYW5kIGxlZ2VuZCB0aXRsZSBmb3IgY291bnQgZmllbGRzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2VsbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DZWxsQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNlbGwgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXJrXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWFyayBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm92ZXJsYXlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3ZlcmxheUNvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXJrIE92ZXJsYXkgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzY2FsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TY2FsZUNvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTY2FsZSBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBeGlzIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGVnZW5kXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xlZ2VuZENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJMZWdlbmQgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmYWNldFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBDb25maWdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkNlbGxDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIndpZHRoXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImhlaWdodFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjbGlwXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZpbGwgY29sb3IuXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlsbCBvcGFjaXR5ICh2YWx1ZSBiZXR3ZWVuIFswLDFdKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2UgY29sb3IuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBvcGFjaXR5ICh2YWx1ZSBiZXR3ZWVuIFswLDFdKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSB3aWR0aCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsdGVybmF0aW5nIHN0cm9rZSwgc3BhY2UgbGVuZ3RocyBmb3IgY3JlYXRpbmcgZGFzaGVkIG9yIGRvdHRlZCBsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaE9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIHN0cm9rZSBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTWFya0NvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmlsbGVkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciB0aGUgc2hhcGVcXFxcJ3MgY29sb3Igc2hvdWxkIGJlIHVzZWQgYXMgZmlsbCBjb2xvciBpbnN0ZWFkIG9mIHN0cm9rZSBjb2xvci5cXG5cXG5UaGlzIGlzIG9ubHkgYXBwbGljYWJsZSBmb3IgXFxcImJhclxcXCIsIFxcXCJwb2ludFxcXCIsIGFuZCBcXFwiYXJlYVxcXCIuXFxuXFxuQWxsIG1hcmtzIGV4Y2VwdCBcXFwicG9pbnRcXFwiIG1hcmtzIGFyZSBmaWxsZWQgYnkgZGVmYXVsdC5cXG5cXG5TZWUgTWFyayBEb2N1bWVudGF0aW9uIChodHRwOi8vdmVnYS5naXRodWIuaW8vdmVnYS1saXRlL2RvY3MvbWFya3MuaHRtbClcXG5cXG5mb3IgdXNhZ2UgZXhhbXBsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgY29sb3IuXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgRmlsbCBDb2xvci4gIFRoaXMgaGFzIGhpZ2hlciBwcmVjZWRlbmNlIHRoYW4gY29uZmlnLmNvbG9yXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBTdHJva2UgQ29sb3IuICBUaGlzIGhhcyBoaWdoZXIgcHJlY2VkZW5jZSB0aGFuIGNvbmZpZy5jb2xvclwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwibWF4aW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwibWF4aW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJtYXhpbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gYXJyYXkgb2YgYWx0ZXJuYXRpbmcgc3Ryb2tlLCBzcGFjZSBsZW5ndGhzIGZvciBjcmVhdGluZyBkYXNoZWQgb3IgZG90dGVkIGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgc3Ryb2tlIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGFja2VkXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1N0YWNrT2Zmc2V0XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JpZW50XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvcmllbnRhdGlvbiBvZiBhIG5vbi1zdGFja2VkIGJhciwgdGljaywgYXJlYSwgYW5kIGxpbmUgY2hhcnRzLlxcblxcblRoZSB2YWx1ZSBpcyBlaXRoZXIgaG9yaXpvbnRhbCAoZGVmYXVsdCkgb3IgdmVydGljYWwuXFxuXFxuLSBGb3IgYmFyLCBydWxlIGFuZCB0aWNrLCB0aGlzIGRldGVybWluZXMgd2hldGhlciB0aGUgc2l6ZSBvZiB0aGUgYmFyIGFuZCB0aWNrXFxuXFxuc2hvdWxkIGJlIGFwcGxpZWQgdG8geCBvciB5IGRpbWVuc2lvbi5cXG5cXG4tIEZvciBhcmVhLCB0aGlzIHByb3BlcnR5IGRldGVybWluZXMgdGhlIG9yaWVudCBwcm9wZXJ0eSBvZiB0aGUgVmVnYSBvdXRwdXQuXFxuXFxuLSBGb3IgbGluZSwgdGhpcyBwcm9wZXJ0eSBkZXRlcm1pbmVzIHRoZSBzb3J0IG9yZGVyIG9mIHRoZSBwb2ludHMgaW4gdGhlIGxpbmVcXG5cXG5pZiBgY29uZmlnLnNvcnRMaW5lQnlgIGlzIG5vdCBzcGVjaWZpZWQuXFxuXFxuRm9yIHN0YWNrZWQgY2hhcnRzLCB0aGlzIGlzIGFsd2F5cyBkZXRlcm1pbmVkIGJ5IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgc3RhY2s7XFxuXFxudGhlcmVmb3JlIGV4cGxpY2l0bHkgc3BlY2lmaWVkIHZhbHVlIHdpbGwgYmUgaWdub3JlZC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImludGVycG9sYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ludGVycG9sYXRlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBsaW5lIGludGVycG9sYXRpb24gbWV0aG9kIHRvIHVzZS4gT25lIG9mIGxpbmVhciwgc3RlcC1iZWZvcmUsIHN0ZXAtYWZ0ZXIsIGJhc2lzLCBiYXNpcy1vcGVuLCBjYXJkaW5hbCwgY2FyZGluYWwtb3BlbiwgbW9ub3RvbmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZW5zaW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVwZW5kaW5nIG9uIHRoZSBpbnRlcnBvbGF0aW9uIHR5cGUsIHNldHMgdGhlIHRlbnNpb24gcGFyYW1ldGVyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGluZVNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIGxpbmUgbWFyay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInJ1bGVTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiBydWxlIG1hcmsuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGJhcnMuICBJZiB1bnNwZWNpZmllZCwgdGhlIGRlZmF1bHQgc2l6ZSBpcyAgYGJhbmRTaXplLTFgLFxcblxcbndoaWNoIHByb3ZpZGVzIDEgcGl4ZWwgb2Zmc2V0IGJldHdlZW4gYmFycy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhclRoaW5TaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGJhcnMgb24gY29udGludW91cyBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzeW1ib2wgc2hhcGUgdG8gdXNlLiBPbmUgb2YgY2lyY2xlIChkZWZhdWx0KSwgc3F1YXJlLCBjcm9zcywgZGlhbW9uZCwgdHJpYW5nbGUtdXAsIG9yIHRyaWFuZ2xlLWRvd24sIG9yIGEgY3VzdG9tIFNWRyBwYXRoLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NoYXBlXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGl4ZWwgYXJlYSBlYWNoIHRoZSBwb2ludC4gRm9yIGV4YW1wbGU6IGluIHRoZSBjYXNlIG9mIGNpcmNsZXMsIHRoZSByYWRpdXMgaXMgZGV0ZXJtaW5lZCBpbiBwYXJ0IGJ5IHRoZSBzcXVhcmUgcm9vdCBvZiB0aGUgc2l6ZSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSB0aWNrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tUaGlja25lc3NcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGlja25lc3Mgb2YgdGhlIHRpY2sgbWFyay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImFsaWduXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0hvcml6b250YWxBbGlnblwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgaG9yaXpvbnRhbCBhbGlnbm1lbnQgb2YgdGhlIHRleHQuIE9uZSBvZiBsZWZ0LCByaWdodCwgY2VudGVyLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYW5nbGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcm90YXRpb24gYW5nbGUgb2YgdGhlIHRleHQsIGluIGRlZ3JlZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9WZXJ0aWNhbEFsaWduXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB2ZXJ0aWNhbCBhbGlnbm1lbnQgb2YgdGhlIHRleHQuIE9uZSBvZiB0b3AsIG1pZGRsZSwgYm90dG9tLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZHhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgaG9yaXpvbnRhbCBvZmZzZXQsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgdGV4dCBsYWJlbCBhbmQgaXRzIGFuY2hvciBwb2ludC4gVGhlIG9mZnNldCBpcyBhcHBsaWVkIGFmdGVyIHJvdGF0aW9uIGJ5IHRoZSBhbmdsZSBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHZlcnRpY2FsIG9mZnNldCwgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSB0ZXh0IGxhYmVsIGFuZCBpdHMgYW5jaG9yIHBvaW50LiBUaGUgb2Zmc2V0IGlzIGFwcGxpZWQgYWZ0ZXIgcm90YXRpb24gYnkgdGhlIGFuZ2xlIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicmFkaXVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUG9sYXIgY29vcmRpbmF0ZSByYWRpYWwgb2Zmc2V0LCBpbiBwaXhlbHMsIG9mIHRoZSB0ZXh0IGxhYmVsIGZyb20gdGhlIG9yaWdpbiBkZXRlcm1pbmVkIGJ5IHRoZSB4IGFuZCB5IHByb3BlcnRpZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aGV0YVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBvbGFyIGNvb3JkaW5hdGUgYW5nbGUsIGluIHJhZGlhbnMsIG9mIHRoZSB0ZXh0IGxhYmVsIGZyb20gdGhlIG9yaWdpbiBkZXRlcm1pbmVkIGJ5IHRoZSB4IGFuZCB5IHByb3BlcnRpZXMuIFZhbHVlcyBmb3IgdGhldGEgZm9sbG93IHRoZSBzYW1lIGNvbnZlbnRpb24gb2YgYXJjIG1hcmsgc3RhcnRBbmdsZSBhbmQgZW5kQW5nbGUgcHJvcGVydGllczogYW5nbGVzIGFyZSBtZWFzdXJlZCBpbiByYWRpYW5zLCB3aXRoIDAgaW5kaWNhdGluZyBcXFwibm9ydGhcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB0eXBlZmFjZSB0byBzZXQgdGhlIHRleHQgaW4gKGUuZy4sIEhlbHZldGljYSBOZXVlKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFN0eWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZvbnRTdHlsZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzdHlsZSAoZS5nLiwgaXRhbGljKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9udFdlaWdodFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCB3ZWlnaHQgKGUuZy4sIGJvbGQpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgdGV4dCB2YWx1ZS4gSWYgbm90IGRlZmluZWQsIHRoaXMgd2lsbCBiZSBkZXRlcm1pbmVkIGF1dG9tYXRpY2FsbHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGxhY2Vob2xkZXIgVGV4dFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXBwbHlDb2xvclRvQmFja2dyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFwcGx5IGNvbG9yIGZpZWxkIHRvIGJhY2tncm91bmQgY29sb3IgaW5zdGVhZCBvZiB0aGUgdGV4dC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJTdGFja09mZnNldFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiemVyb1wiLFxuICAgICAgICBcImNlbnRlclwiLFxuICAgICAgICBcIm5vcm1hbGl6ZVwiLFxuICAgICAgICBcIm5vbmVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJPcmllbnRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImhvcml6b250YWxcIixcbiAgICAgICAgXCJ2ZXJ0aWNhbFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkludGVycG9sYXRlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsaW5lYXJcIixcbiAgICAgICAgXCJsaW5lYXItY2xvc2VkXCIsXG4gICAgICAgIFwic3RlcFwiLFxuICAgICAgICBcInN0ZXAtYmVmb3JlXCIsXG4gICAgICAgIFwic3RlcC1hZnRlclwiLFxuICAgICAgICBcImJhc2lzXCIsXG4gICAgICAgIFwiYmFzaXMtb3BlblwiLFxuICAgICAgICBcImJhc2lzLWNsb3NlZFwiLFxuICAgICAgICBcImNhcmRpbmFsXCIsXG4gICAgICAgIFwiY2FyZGluYWwtb3BlblwiLFxuICAgICAgICBcImNhcmRpbmFsLWNsb3NlZFwiLFxuICAgICAgICBcImJ1bmRsZVwiLFxuICAgICAgICBcIm1vbm90b25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU2hhcGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImNpcmNsZVwiLFxuICAgICAgICBcInNxdWFyZVwiLFxuICAgICAgICBcImNyb3NzXCIsXG4gICAgICAgIFwiZGlhbW9uZFwiLFxuICAgICAgICBcInRyaWFuZ2xlLXVwXCIsXG4gICAgICAgIFwidHJpYW5nbGUtZG93blwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkhvcml6b250YWxBbGlnblwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGVmdFwiLFxuICAgICAgICBcInJpZ2h0XCIsXG4gICAgICAgIFwiY2VudGVyXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVmVydGljYWxBbGlnblwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwidG9wXCIsXG4gICAgICAgIFwibWlkZGxlXCIsXG4gICAgICAgIFwiYm90dG9tXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRm9udFN0eWxlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJub3JtYWxcIixcbiAgICAgICAgXCJpdGFsaWNcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGb250V2VpZ2h0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJub3JtYWxcIixcbiAgICAgICAgXCJib2xkXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiT3ZlcmxheUNvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgdG8gb3ZlcmxheSBsaW5lIHdpdGggcG9pbnQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXJlYVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BcmVhT3ZlcmxheVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUeXBlIG9mIG92ZXJsYXkgZm9yIGFyZWEgbWFyayAobGluZSBvciBsaW5lcG9pbnQpXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwb2ludFN0eWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBzdHlsZSBmb3IgdGhlIG92ZXJsYXllZCBwb2ludC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxpbmVTdHlsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgc3R5bGUgZm9yIHRoZSBvdmVybGF5ZWQgcG9pbnQuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBcmVhT3ZlcmxheVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZVwiLFxuICAgICAgICBcImxpbmVwb2ludFwiLFxuICAgICAgICBcIm5vbmVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTY2FsZUNvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiB0cnVlLCByb3VuZHMgbnVtZXJpYyBvdXRwdXQgdmFsdWVzIHRvIGludGVnZXJzLlxcblxcblRoaXMgY2FuIGJlIGhlbHBmdWwgZm9yIHNuYXBwaW5nIHRvIHRoZSBwaXhlbCBncmlkLlxcblxcbihPbmx5IGF2YWlsYWJsZSBmb3IgYHhgLCBgeWAsIGBzaXplYCwgYHJvd2AsIGFuZCBgY29sdW1uYCBzY2FsZXMuKVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRleHRCYW5kV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGJhbmQgd2lkdGggZm9yIGB4YCBvcmRpbmFsIHNjYWxlIHdoZW4gaXMgbWFyayBpcyBgdGV4dGAuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYW5kU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgYmFuZCBzaXplIGZvciAoMSkgYHlgIG9yZGluYWwgc2NhbGUsXFxuXFxuYW5kICgyKSBgeGAgb3JkaW5hbCBzY2FsZSB3aGVuIHRoZSBtYXJrIGlzIG5vdCBgdGV4dGAuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igb3BhY2l0eS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcGFkZGluZyBmb3IgYHhgIGFuZCBgeWAgb3JkaW5hbCBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ1c2VSYXdEb21haW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJVc2VzIHRoZSBzb3VyY2UgZGF0YSByYW5nZSBhcyBzY2FsZSBkb21haW4gaW5zdGVhZCBvZiBhZ2dyZWdhdGVkIGRhdGEgZm9yIGFnZ3JlZ2F0ZSBheGlzLlxcblxcblRoaXMgcHJvcGVydHkgb25seSB3b3JrcyB3aXRoIGFnZ3JlZ2F0ZSBmdW5jdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyB3aXRoaW4gdGhlIHJhdyBkYXRhIGRvbWFpbiAoYFxcXCJtZWFuXFxcImAsIGBcXFwiYXZlcmFnZVxcXCJgLCBgXFxcInN0ZGV2XFxcImAsIGBcXFwic3RkZXZwXFxcImAsIGBcXFwibWVkaWFuXFxcImAsIGBcXFwicTFcXFwiYCwgYFxcXCJxM1xcXCJgLCBgXFxcIm1pblxcXCJgLCBgXFxcIm1heFxcXCJgKS4gRm9yIG90aGVyIGFnZ3JlZ2F0aW9ucyB0aGF0IHByb2R1Y2UgdmFsdWVzIG91dHNpZGUgb2YgdGhlIHJhdyBkYXRhIGRvbWFpbiAoZS5nLiBgXFxcImNvdW50XFxcImAsIGBcXFwic3VtXFxcImApLCB0aGlzIHByb3BlcnR5IGlzIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibm9taW5hbENvbG9yUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBub21pbmFsIGNvbG9yIHNjYWxlXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNlcXVlbnRpYWxDb2xvclJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igb3JkaW5hbCAvIGNvbnRpbnVvdXMgY29sb3Igc2NhbGVcIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIHNoYXBlXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImJhclNpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIGJhciBzaXplIHNjYWxlXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBmb250IHNpemUgc2NhbGVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicnVsZVNpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIHJ1bGUgc3Ryb2tlIHdpZHRoc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgdGljayBzcGFuc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwb2ludFNpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIGJhciBzaXplIHNjYWxlXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkF4aXNDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImF4aXNXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldpZHRoIG9mIHRoZSBheGlzIGxpbmVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxheWVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgaW5kaWNhdGluZyBpZiB0aGUgYXhpcyAoYW5kIGFueSBncmlkbGluZXMpIHNob3VsZCBiZSBwbGFjZWQgYWJvdmUgb3IgYmVsb3cgdGhlIGRhdGEgbWFya3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0LCBpbiBwaXhlbHMsIGJ5IHdoaWNoIHRvIGRpc3BsYWNlIHRoZSBheGlzIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIGF4aXMgbGluZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGZsYWcgaW5kaWNhdGUgaWYgZ3JpZGxpbmVzIHNob3VsZCBiZSBjcmVhdGVkIGluIGFkZGl0aW9uIHRvIHRpY2tzLiBJZiBgZ3JpZGAgaXMgdW5zcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgUk9XIGFuZCBDT0wuIEZvciBYIGFuZCBZLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIHF1YW50aXRhdGl2ZSBhbmQgdGltZSBmaWVsZHMgYW5kIGBmYWxzZWAgb3RoZXJ3aXNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIGdyaWRsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWREYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgZ3JpZCBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugb3BhY2l0eSBvZiBncmlkICh2YWx1ZSBiZXR3ZWVuIFswLDFdKVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGdyaWQgd2lkdGgsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkVuYWJsZSBvciBkaXNhYmxlIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFuZ2xlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJvdGF0aW9uIGFuZ2xlIG9mIHRoZSBheGlzIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQWxpZ25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGFsaWdubWVudCBmb3IgdGhlIExhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYmFzZWxpbmUgZm9yIHRoZSBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsTWF4TGVuZ3RoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHJ1bmNhdGUgbGFiZWxzIHRoYXQgYXJlIHRvbyBsb25nLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBhbmQgZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdWJkaXZpZGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBwcm92aWRlZCwgc2V0cyB0aGUgbnVtYmVyIG9mIG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3IgdGlja3MgKHRoZSB2YWx1ZSA5IHJlc3VsdHMgaW4gZGVjaW1hbCBzdWJkaXZpc2lvbikuIE9ubHkgYXBwbGljYWJsZSBmb3IgYXhlcyB2aXN1YWxpemluZyBxdWFudGl0YXRpdmUgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja3NcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGRlc2lyZWQgbnVtYmVyIG9mIHRpY2tzLCBmb3IgYXhlcyB2aXN1YWxpemluZyBxdWFudGl0YXRpdmUgc2NhbGVzLiBUaGUgcmVzdWx0aW5nIG51bWJlciBtYXkgYmUgZGlmZmVyZW50IHNvIHRoYXQgdmFsdWVzIGFyZSBcXFwibmljZVxcXCIgKG11bHRpcGxlcyBvZiAyLCA1LCAxMCkgYW5kIGxpZSB3aXRoaW4gdGhlIHVuZGVybHlpbmcgc2NhbGUncyByYW5nZS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgYXhpcydzIHRpY2suXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgdGljayBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbEZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgdGljayBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsYWJlbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1BhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRpY2tzIGFuZCB0ZXh0IGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWFqb3IsIG1pbm9yIGFuZCBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZU1ham9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWFqb3IgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZU1pbm9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWlub3IgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZUVuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCwgaW4gcGl4ZWxzLCBvZiB0aWNrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGb250IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldlaWdodCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgdGl0bGUgb2Zmc2V0IHZhbHVlIGZvciB0aGUgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlTWF4TGVuZ3RoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWF4IGxlbmd0aCBmb3IgYXhpcyB0aXRsZSBpZiB0aGUgdGl0bGUgaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgZnJvbSB0aGUgZmllbGQncyBkZXNjcmlwdGlvbi4gQnkgZGVmYXVsdCwgdGhpcyBpcyBhdXRvbWF0aWNhbGx5IGJhc2VkIG9uIGNlbGwgc2l6ZSBhbmQgY2hhcmFjdGVyV2lkdGggcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjaGFyYWN0ZXJXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNoYXJhY3RlciB3aWR0aCBmb3IgYXV0b21hdGljYWxseSBkZXRlcm1pbmluZyB0aXRsZSBtYXggbGVuZ3RoLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBheGlzIHN0eWxpbmcuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJMZWdlbmRDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm9yaWVudFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvcmllbnRhdGlvbiBvZiB0aGUgbGVnZW5kLiBPbmUgb2YgXFxcImxlZnRcXFwiIG9yIFxcXCJyaWdodFxcXCIuIFRoaXMgZGV0ZXJtaW5lcyBob3cgdGhlIGxlZ2VuZCBpcyBwb3NpdGlvbmVkIHdpdGhpbiB0aGUgc2NlbmUuIFRoZSBkZWZhdWx0IGlzIFxcXCJyaWdodFxcXCIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0LCBpbiBwaXhlbHMsIGJ5IHdoaWNoIHRvIGRpc3BsYWNlIHRoZSBsZWdlbmQgZnJvbSB0aGUgZWRnZSBvZiB0aGUgZW5jbG9zaW5nIGdyb3VwIG9yIGRhdGEgcmVjdGFuZ2xlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwYWRkaW5nLCBpbiBwaXhlbHMsIGJldHdlZW4gdGhlIGxlbmdlbmQgYW5kIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXJnaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyZ2luIGFyb3VuZCB0aGUgbGVnZW5kLCBpbiBwaXhlbHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50U3Ryb2tlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGdyYWRpZW50IHN0cm9rZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50U3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50IHN0cm9rZSwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRIZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgaGVpZ2h0IG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQWxpZ25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgYWxpZ25tZW50IG9mIHRoZSBsZWdlbmQgbGFiZWwsIGNhbiBiZSBsZWZ0LCBtaWRkbGUgb3IgcmlnaHQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBvc2l0aW9uIG9mIHRoZSBiYXNlbGluZSBvZiBsZWdlbmQgbGFiZWwsIGNhbiBiZSB0b3AsIG1pZGRsZSBvciBib3R0b20uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgbGVuZ2VuZCBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIGxlbmdlbmQgbGFibGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgb2YgdGhlIGxlZ2VuZCBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggbmFtZXMgYW5kIHdlZWtkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgc3ltYm9sLFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU2hhcGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2hhcGUgb2YgdGhlIGxlZ2VuZCBzeW1ib2wsIGNhbiBiZSB0aGUgJ2NpcmNsZScsICdzcXVhcmUnLCAnY3Jvc3MnLCAnZGlhbW9uZCcsXFxuXFxuJ3RyaWFuZ2xlLXVwJywgJ3RyaWFuZ2xlLWRvd24nLCBvciBlbHNlIGEgY3VzdG9tIFNWRyBwYXRoIHN0cmluZy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgbGVuZ2VuZCBzeW1ib2wsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBzeW1ib2wncyBzdHJva2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlxcblxcblRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCB3ZWlnaHQgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRTY2FsZUNvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBTY2FsZSBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBBeGlzIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldEdyaWRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgR3JpZCBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNlbGxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2VsbENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBDZWxsIENvbmZpZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRTY2FsZUNvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm91bmRcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRHcmlkQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmYWNldFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3BlY1wiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTGF5ZXJTcGVjXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVW5pdFNwZWNcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmFjZXRcIixcbiAgICAgICAgXCJzcGVjXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRmFjZXRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvd1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbHVtblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkxheWVyU3BlY1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibGF5ZXJzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVW5pdCBzcGVjcyB0aGF0IHdpbGwgYmUgbGF5ZXJlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Vbml0U3BlY1wiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm5hbWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSB2aXN1YWxpemF0aW9uIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgbWFyayBmb3IgY29tbWVudGluZyBwdXJwb3NlLlxcblxcblRoaXMgcHJvcGVydHkgaGFzIG5vIGVmZmVjdCBvbiB0aGUgb3V0cHV0IHZpc3VhbGl6YXRpb24uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRhdGEgc291cmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHJhbnNmb3JtXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIGZpbHRlciBhbmQgbmV3IGZpZWxkIGNhbGN1bGF0aW9uLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJsYXllcnNcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJVbml0U3BlY1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibWFya1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJrIHR5cGUuXFxuXFxuT25lIG9mIGBcXFwiYmFyXFxcImAsIGBcXFwiY2lyY2xlXFxcImAsIGBcXFwic3F1YXJlXFxcImAsIGBcXFwidGlja1xcXCJgLCBgXFxcImxpbmVcXFwiYCxcXG5cXG5gXFxcImFyZWFcXFwiYCwgYFxcXCJwb2ludFxcXCJgLCBgXFxcInJ1bGVcXFwiYCwgYW5kIGBcXFwidGV4dFxcXCJgLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5jb2RpbmdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVW5pdEVuY29kaW5nXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEga2V5LXZhbHVlIG1hcHBpbmcgYmV0d2VlbiBlbmNvZGluZyBjaGFubmVscyBhbmQgZGVmaW5pdGlvbiBvZiBmaWVsZHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibWFya1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlVuaXRFbmNvZGluZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwieFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWCBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcIngyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieTJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBmaWxsIG9yIHN0cm9rZSBjb2xvciBiYXNlZCBvbiBtYXJrIHR5cGUuXFxuXFxuKEJ5IGRlZmF1bHQsIGZpbGwgY29sb3IgZm9yIGBhcmVhYCwgYGJhcmAsIGB0aWNrYCwgYHRleHRgLCBgY2lyY2xlYCwgYW5kIGBzcXVhcmVgIC9cXG5cXG5zdHJva2UgY29sb3IgZm9yIGBsaW5lYCBhbmQgYHBvaW50YC4pXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wYWNpdHkgb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgY2FuIGJlIGEgdmFsdWUgb3IgaW4gYSByYW5nZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNpemVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgcG9pbnRgLCBgc3F1YXJlYCBhbmQgYGNpcmNsZWBcXG5cXG7igJMgdGhlIHN5bWJvbCBzaXplLCBvciBwaXhlbCBhcmVhIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBiYXJgIGFuZCBgdGlja2Ag4oCTIHRoZSBiYXIgYW5kIHRpY2sncyBzaXplLlxcblxcbi0gRm9yIGB0ZXh0YCDigJMgdGhlIHRleHQncyBmb250IHNpemUuXFxuXFxuLSBTaXplIGlzIGN1cnJlbnRseSB1bnN1cHBvcnRlZCBmb3IgYGxpbmVgIGFuZCBgYXJlYWAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3ltYm9sJ3Mgc2hhcGUgKG9ubHkgZm9yIGBwb2ludGAgbWFya3MpLiBUaGUgc3VwcG9ydGVkIHZhbHVlcyBhcmVcXG5cXG5gXFxcImNpcmNsZVxcXCJgIChkZWZhdWx0KSwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJjcm9zc1xcXCJgLCBgXFxcImRpYW1vbmRcXFwiYCwgYFxcXCJ0cmlhbmdsZS11cFxcXCJgLFxcblxcbm9yIGBcXFwidHJpYW5nbGUtZG93blxcXCJgLCBvciBlbHNlIGEgY3VzdG9tIFNWRyBwYXRoIHN0cmluZy5cIlxuICAgICAgICB9LFxuICAgICAgICBcImRldGFpbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFkZGl0aW9uYWwgbGV2ZWxzIG9mIGRldGFpbCBmb3IgZ3JvdXBpbmcgZGF0YSBpbiBhZ2dyZWdhdGUgdmlld3MgYW5kXFxuXFxuaW4gbGluZSBhbmQgYXJlYSBtYXJrcyB3aXRob3V0IG1hcHBpbmcgZGF0YSB0byBhIHNwZWNpZmljIHZpc3VhbCBjaGFubmVsLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IG9mIHRoZSBgdGV4dGAgbWFyay5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYXRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3JkZXIgb2YgZGF0YSBwb2ludHMgaW4gbGluZSBtYXJrcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcIm9yZGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTGF5ZXIgb3JkZXIgZm9yIG5vbi1zdGFja2VkIG1hcmtzLCBvciBzdGFjayBvcmRlciBmb3Igc3RhY2tlZCBtYXJrcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIiRzY2hlbWFcIjogXCJodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA0L3NjaGVtYSNcIlxufTsiLCIndXNlIHN0cmljdCc7XG4vKiBnbG9iYWxzIHdpbmRvdywgYW5ndWxhciAqL1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScsIFtcbiAgICAnTG9jYWxTdG9yYWdlTW9kdWxlJyxcbiAgICAnYW5ndWxhci1nb29nbGUtYW5hbHl0aWNzJyxcbiAgICAnYW5ndWxhci1zb3J0YWJsZS12aWV3JyxcbiAgICAnYW5ndWxhci13ZWJzcWwnLFxuICAgICd1aS1yYW5nZVNsaWRlcidcbiAgXSlcbiAgLmNvbnN0YW50KCdfJywgd2luZG93Ll8pXG4gIC8vIGRhdGFsaWIsIHZlZ2FsaXRlLCB2ZWdhXG4gIC5jb25zdGFudCgndmwnLCB3aW5kb3cudmwpXG4gIC5jb25zdGFudCgnY3FsJywgd2luZG93LmNxbClcbiAgLmNvbnN0YW50KCd2bFNjaGVtYScsIHdpbmRvdy52bFNjaGVtYSlcbiAgLmNvbnN0YW50KCd2ZycsIHdpbmRvdy52ZylcbiAgLmNvbnN0YW50KCd1dGlsJywgd2luZG93LnZnLnV0aWwpXG4gIC8vIG90aGVyIGxpYnJhcmllc1xuICAuY29uc3RhbnQoJ2pRdWVyeScsIHdpbmRvdy4kKVxuICAuY29uc3RhbnQoJ1BhcGEnLCB3aW5kb3cuUGFwYSlcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBVc2UgdGhlIGN1c3RvbWl6ZWQgdmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnlcbiAgLmNvbnN0YW50KCdKU09OMycsIHdpbmRvdy5KU09OMy5ub0NvbmZsaWN0KCkpXG4gIC5jb25zdGFudCgnQU5ZJywgJ19fQU5ZX18nKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBsb2dMZXZlbDogJ0lORk8nLFxuICAgIGxvZ1ByaW50TGV2ZWw6ICdJTkZPJyxcbiAgICBsb2dUb1dlYlNxbDogZmFsc2UsIC8vIGluIHVzZXIgc3R1ZGllcywgc2V0IHRoaXMgdG8gdHJ1ZVxuICAgIGRlZmF1bHRDb25maWdTZXQ6ICdsYXJnZScsXG4gICAgYXBwSWQ6ICd2bHVpJyxcbiAgICAvLyBlbWJlZGRlZCBwb2xlc3RhciBhbmQgdm95YWdlciB3aXRoIGtub3duIGRhdGFcbiAgICBlbWJlZGRlZERhdGE6IHdpbmRvdy52Z3VpRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgcHJpb3JpdHk6IHtcbiAgICAgIGJvb2ttYXJrOiAwLFxuICAgICAgcG9wdXA6IDAsXG4gICAgICB2aXNsaXN0OiAxMDAwXG4gICAgfSxcbiAgICBteXJpYVJlc3Q6ICdodHRwOi8vZWMyLTUyLTEtMzgtMTgyLmNvbXB1dGUtMS5hbWF6b25hd3MuY29tOjg3NTMnLFxuICAgIGRlZmF1bHRUaW1lRm46ICd5ZWFyJyxcbiAgICB3aWxkY2FyZEZuOiB0cnVlXG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoXCJ2bHVpXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFkZC1teXJpYS1kYXRhc2V0XFxcIj48cD5TZWxlY3QgYSBkYXRhc2V0IGZyb20gdGhlIE15cmlhIGluc3RhbmNlIGF0IDxpbnB1dCBuZy1tb2RlbD1cXFwibXlyaWFSZXN0VXJsXFxcIj48YnV0dG9uIG5nLWNsaWNrPVxcXCJsb2FkRGF0YXNldHMoXFwnXFwnKVxcXCI+dXBkYXRlPC9idXR0b24+LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQobXlyaWFEYXRhc2V0KVxcXCI+PGRpdj48c2VsZWN0IG5hbWU9XFxcIm15cmlhLWRhdGFzZXRcXFwiIGlkPVxcXCJzZWxlY3QtbXlyaWEtZGF0YXNldFxcXCIgbmctZGlzYWJsZWQ9XFxcImRpc2FibGVkXFxcIiBuZy1tb2RlbD1cXFwibXlyaWFEYXRhc2V0XFxcIiBuZy1vcHRpb25zPVxcXCJvcHRpb25OYW1lKGRhdGFzZXQpIGZvciBkYXRhc2V0IGluIG15cmlhRGF0YXNldHMgdHJhY2sgYnkgZGF0YXNldC5yZWxhdGlvbk5hbWVcXFwiPjxvcHRpb24gdmFsdWU9XFxcIlxcXCI+U2VsZWN0IERhdGFzZXQuLi48L29wdGlvbj48L3NlbGVjdD48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGFzZXQ8L2J1dHRvbj48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFkZC11cmwtZGF0YXNldFxcXCI+PHA+QWRkIHRoZSBuYW1lIG9mIHRoZSBkYXRhc2V0IGFuZCB0aGUgVVJMIHRvIGEgPGI+SlNPTjwvYj4gb3IgPGI+Q1NWPC9iPiAod2l0aCBoZWFkZXIpIGZpbGUuIE1ha2Ugc3VyZSB0aGF0IHRoZSBmb3JtYXR0aW5nIGlzIGNvcnJlY3QgYW5kIGNsZWFuIHRoZSBkYXRhIGJlZm9yZSBhZGRpbmcgaXQuIFRoZSBhZGRlZCBkYXRhc2V0IGlzIG9ubHkgdmlzaWJsZSB0byB5b3UuPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRnJvbVVybChhZGRlZERhdGFzZXQpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LXVybFxcXCI+VVJMPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQudXJsXFxcIiBpZD1cXFwiZGF0YXNldC11cmxcXFwiIHR5cGU9XFxcInVybFxcXCI+PHA+TWFrZSBzdXJlIHRoYXQgeW91IGhvc3QgdGhlIGZpbGUgb24gYSBzZXJ2ZXIgdGhhdCBoYXMgPGNvZGU+QWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luOiAqPC9jb2RlPiBzZXQuPC9wPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiY2hhbmdlLWxvYWRlZC1kYXRhc2V0XFxcIj48ZGl2IG5nLWlmPVxcXCJ1c2VyRGF0YS5sZW5ndGhcXFwiPjxoMz5VcGxvYWRlZCBEYXRhc2V0czwvaDM+PHVsPjxsaSBuZy1yZXBlYXQ9XFxcImRhdGFzZXQgaW4gdXNlckRhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzcGFuIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvc3Bhbj4gPHN0cm9uZyBuZy1pZj1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldCA9PT0gZGF0YXNldFxcXCI+KHNlbGVjdGVkKTwvc3Ryb25nPjwvbGk+PC91bD48L2Rpdj48aDM+RXhwbG9yZSBhIFNhbXBsZSBEYXRhc2V0PC9oMz48dWwgY2xhc3M9XFxcImxvYWRlZC1kYXRhc2V0LWxpc3RcXFwiPjxsaSBuZy1yZXBlYXQ9XFxcImRhdGFzZXQgaW4gc2FtcGxlRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHN0cm9uZyBuZy1pZj1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldCA9PT0gZGF0YXNldFxcXCI+KHNlbGVjdGVkKTwvc3Ryb25nPiA8ZW0gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9lbT48L2xpPjwvdWw+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbFwiLFwiPG1vZGFsIGlkPVxcXCJkYXRhc2V0LW1vZGFsXFxcIiBtYXgtd2lkdGg9XFxcIjgwMHB4XFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1oZWFkZXJcXFwiPjxtb2RhbC1jbG9zZS1idXR0b24+PC9tb2RhbC1jbG9zZS1idXR0b24+PGgyPkFkZCBEYXRhc2V0PC9oMj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1tYWluXFxcIj48dGFic2V0Pjx0YWIgaGVhZGluZz1cXFwiQ2hhbmdlIERhdGFzZXRcXFwiPjxjaGFuZ2UtbG9hZGVkLWRhdGFzZXQ+PC9jaGFuZ2UtbG9hZGVkLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJQYXN0ZSBvciBVcGxvYWQgRGF0YVxcXCI+PHBhc3RlLWRhdGFzZXQ+PC9wYXN0ZS1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBVUkxcXFwiPjxhZGQtdXJsLWRhdGFzZXQ+PC9hZGQtdXJsLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIE15cmlhXFxcIj48YWRkLW15cmlhLWRhdGFzZXQ+PC9hZGQtbXlyaWEtZGF0YXNldD48L3RhYj48L3RhYnNldD48L2Rpdj48L21vZGFsPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmh0bWxcIixcIjxidXR0b24gaWQ9XFxcInNlbGVjdC1kYXRhXFxcIiBjbGFzcz1cXFwic21hbGwtYnV0dG9uIHNlbGVjdC1kYXRhXFxcIiBuZy1jbGljaz1cXFwibG9hZERhdGFzZXQoKTtcXFwiPkNoYW5nZTwvYnV0dG9uPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImRyb3B6b25lXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInBhc3RlLWRhdGFcXFwiPjxmaWxlLWRyb3B6b25lIGRhdGFzZXQ9XFxcImRhdGFzZXRcXFwiIG1heC1maWxlLXNpemU9XFxcIjEwXFxcIiB2YWxpZC1taW1lLXR5cGVzPVxcXCJbdGV4dC9jc3YsIHRleHQvanNvbiwgdGV4dC90c3ZdXFxcIj48ZGl2IGNsYXNzPVxcXCJ1cGxvYWQtZGF0YVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1maWxlXFxcIj5GaWxlPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcImZpbGVcXFwiIGlkPVxcXCJkYXRhc2V0LWZpbGVcXFwiIGFjY2VwdD1cXFwidGV4dC9jc3YsdGV4dC90c3ZcXFwiPjwvZGl2PjxwPlVwbG9hZCBhIENTViwgb3IgcGFzdGUgZGF0YSBpbiA8YSBocmVmPVxcXCJodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db21tYS1zZXBhcmF0ZWRfdmFsdWVzXFxcIj5DU1Y8L2E+IGZvcm1hdCBpbnRvIHRoZSBmaWVsZHMuPC9wPjxkaXYgY2xhc3M9XFxcImRyb3B6b25lLXRhcmdldFxcXCI+PHA+RHJvcCBDU1YgZmlsZSBoZXJlPC9wPjwvZGl2PjwvZGl2Pjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwibmFtZVxcXCIgbmctbW9kZWw9XFxcImRhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PHRleHRhcmVhIG5nLW1vZGVsPVxcXCJkYXRhc2V0LmRhdGFcXFwiIG5nLW1vZGVsLW9wdGlvbnM9XFxcInsgdXBkYXRlT246IFxcJ2RlZmF1bHQgYmx1clxcJywgZGVib3VuY2U6IHsgXFwnZGVmYXVsdFxcJzogMTcsIFxcJ2JsdXJcXCc6IDAgfX1cXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcbiAgICAgIDwvdGV4dGFyZWE+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhPC9idXR0b24+PC9mb3JtPjwvZmlsZS1kcm9wem9uZT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuaHRtbFwiLFwiPG1vZGFsIGlkPVxcXCJib29rbWFyay1saXN0XFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1oZWFkZXIgY2FyZCBuby10b3AtbWFyZ2luIG5vLXJpZ2h0LW1hcmdpblxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbiBjbG9zZS1hY3Rpb249XFxcIkJvb2ttYXJrcy5sb2dCb29rbWFya3NDbG9zZWQoKVxcXCI+PC9tb2RhbC1jbG9zZS1idXR0b24+PGgyIGNsYXNzPVxcXCJuby1ib3R0b20tbWFyZ2luXFxcIj5Cb29rbWFya3MgKHt7IEJvb2ttYXJrcy5saXN0Lmxlbmd0aCB9fSk8L2gyPjxhIGNsYXNzPVxcXCJib29rbWFyay1saXN0LXV0aWxcXFwiIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gQ2xlYXIgYWxsPC9hPiA8YSBjbGFzcz1cXFwiYm9va21hcmstbGlzdC11dGlsXFxcIiBuZy1jbGljaz1cXFwiQm9va21hcmtzLmV4cG9ydCgpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2xpcGJvYXJkXFxcIj48L2k+IEV4cG9ydDwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmbGV4LWdyb3ctMSBzY3JvbGwteVxcXCI+PGRpdiBuZy1pZj1cXFwiQm9va21hcmtzLmxpc3QubGVuZ3RoID4gMFxcXCIgY2xhc3M9XFxcImhmbGV4IGZsZXgtd3JhcFxcXCIgc3Ytcm9vdD1cXFwiXFxcIiBzdi1wYXJ0PVxcXCJCb29rbWFya3MubGlzdFxcXCIgc3Ytb24tc29ydD1cXFwiQm9va21hcmtzLnJlb3JkZXIoKVxcXCI+PHZsLXBsb3QtZ3JvdXAgbmctcmVwZWF0PVxcXCJib29rbWFyayBpbiBCb29rbWFya3MubGlzdCB8IG9yZGVyT2JqZWN0QnkgOiBcXCd0aW1lQWRkZWRcXCcgOiBmYWxzZVxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cCBjYXJkXFxcIiBsaXN0LXRpdGxlPVxcXCJcXCdCb29rbWFya1xcJ1xcXCIgY2hhcnQ9XFxcImJvb2ttYXJrLmNoYXJ0XFxcIiBmaWVsZC1zZXQ9XFxcImJvb2ttYXJrLmNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWdcXFwiIHNob3ctZXhwYW5kPVxcXCJmYWxzZVxcXCIgYWx3YXlzLXNlbGVjdGVkPVxcXCJ0cnVlXFxcIiBoaWdobGlnaHRlZD1cXFwiaGlnaGxpZ2h0ZWRcXFwiIG92ZXJmbG93PVxcXCJ0cnVlXFxcIiB0b29sdGlwPVxcXCJ0cnVlXFxcIiBwcmlvcml0eT1cXFwiY29uc3RzLnByaW9yaXR5LmJvb2ttYXJrXFxcIiBzaG93LXNlbGVjdD1cXFwidHJ1ZVxcXCIgc3YtZWxlbWVudD1cXFwiXFxcIj48L3ZsLXBsb3QtZ3JvdXA+PGRpdiBzdi1wbGFjZWhvbGRlcj1cXFwiXFxcIj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5saXN0Lmxlbmd0aCA9PT0gMFxcXCI+WW91IGhhdmUgbm8gYm9va21hcmtzPC9kaXY+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2FsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhbGVydC1ib3hcXFwiIG5nLXNob3c9XFxcIkFsZXJ0cy5hbGVydHMubGVuZ3RoID4gMFxcXCI+PGRpdiBjbGFzcz1cXFwiYWxlcnQtaXRlbVxcXCIgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBBbGVydHMuYWxlcnRzXFxcIj57eyBhbGVydC5tc2cgfX0gPGEgY2xhc3M9XFxcImNsb3NlXFxcIiBuZy1jbGljaz1cXFwiQWxlcnRzLmNsb3NlQWxlcnQoJGluZGV4KVxcXCI+JnRpbWVzOzwvYT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwic2hlbGYtZ3JvdXBcXFwiPjxkaXYgY2xhc3M9XFxcInNoZWxmXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiBkaXNhYmxlZCB8fCAhc3VwcG9ydE1hcmsoY2hhbm5lbElkLCBtYXJrKSwgXFwnYW55XFwnOiBpc0FueUNoYW5uZWx9XFxcIj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1sYWJlbFxcXCIgbmctY2xhc3M9XFxcIntleHBhbmRlZDogcHJvcHNFeHBhbmRlZH1cXFwiPnt7IGlzQW55Q2hhbm5lbCA/IFxcJ2FueVxcJyA6IGNoYW5uZWxJZCB9fTwvZGl2PjxkaXYgY2xhc3M9XFxcImZpZWxkLWRyb3BcXFwiIG5nLW1vZGVsPVxcXCJwaWxsc1tjaGFubmVsSWRdXFxcIiBkYXRhLWRyb3A9XFxcIiFkaXNhYmxlZCAmJiBzdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspXFxcIiBqcXlvdWktZHJvcHBhYmxlPVxcXCJ7b25Ecm9wOlxcJ2ZpZWxkRHJvcHBlZFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcInthY3RpdmVDbGFzczogXFwnZHJvcC1hY3RpdmVcXCd9XFxcIj48ZmllbGQtaW5mbyBuZy1zaG93PVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdLmZpZWxkXFxcIiBuZy1jbGFzcz1cXFwieyBleHBhbmRlZDogZnVuY3NFeHBhbmRlZCwgYW55OiBpc0FueUZpZWxkIHx8IGlzQW55RnVuY3Rpb24sIFxcJ2VudW1lcmF0ZWQtZmllbGRcXCc6IGlzRW51bWVyYXRlZEZpZWxkLCBcXCdlbnVtZXJhdGVkLWNoYW5uZWxcXCc6IGlzRW51bWVyYXRlZENoYW5uZWwsIGhpZ2hsaWdodGVkOiBpc0hpZ2hsaWdodGVkKGNoYW5uZWxJZCkgfVxcXCIgZmllbGQtZGVmPVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdXFxcIiBzaG93LXR5cGU9XFxcInRydWVcXFwiIHNob3ctY2FyZXQ9XFxcInRydWVcXFwiIHNob3ctZW51bS1zcGVjLWZuPVxcXCJ0cnVlXFxcIiBkaXNhYmxlLWNhcmV0PVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdLmFnZ3JlZ2F0ZT09PVxcJ2NvdW50XFwnIHx8ICFoYXNGdW5jdGlvbnNcXFwiIHBvcHVwLWNvbnRlbnQ9XFxcImZpZWxkSW5mb1BvcHVwQ29udGVudFxcXCIgc2hvdy1yZW1vdmU9XFxcInRydWVcXFwiIHJlbW92ZS1hY3Rpb249XFxcInJlbW92ZUZpZWxkKClcXFwiIGNsYXNzPVxcXCJzZWxlY3RlZCBkcmFnZ2FibGUgZnVsbC13aWR0aFxcXCIgZGF0YS1kcmFnPVxcXCJ0cnVlXFxcIiBuZy1tb2RlbD1cXFwicGlsbHNbY2hhbm5lbElkXVxcXCIganF5b3VpLWRyYWdnYWJsZT1cXFwie29uU3RhcnQ6IFxcJ2ZpZWxkRHJhZ1N0YXJ0XFwnLCBvblN0b3A6XFwnZmllbGREcmFnU3RvcFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcIntyZXZlcnQ6IFxcJ2ludmFsaWRcXCcsIGhlbHBlcjogXFwnY2xvbmVcXCd9XFxcIj48L2ZpZWxkLWluZm8+PHNwYW4gY2xhc3M9XFxcInBsYWNlaG9sZGVyXFxcIiBuZy1pZj1cXFwiIWVuY29kaW5nW2NoYW5uZWxJZF0uZmllbGRcXFwiPmRyb3AgYSBmaWVsZCBoZXJlPC9zcGFuPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9XFxcImRyb3AtY29udGFpbmVyXFxcIj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHNoZWxmLXByb3BlcnRpZXMgc2hlbGYtcHJvcGVydGllcy17e2NoYW5uZWxJZH19XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHNoZWxmLWZ1bmN0aW9ucyBzaGVsZi1mdW5jdGlvbnMte3tjaGFubmVsSWR9fVxcXCIgbmctaGlkZT1cXFwiIWhhc0Z1bmN0aW9uc1xcXCI+PGZ1bmN0aW9uLXNlbGVjdCBuZy1pZj1cXFwiIXByZXZpZXdcXFwiIGZpZWxkLWRlZj1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXVxcXCIgY2hhbm5lbC1pZD1cXFwiY2hhbm5lbElkXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueSAmJiBjb25zdHMud2lsZGNhcmRGblxcXCI+PC9mdW5jdGlvbi1zZWxlY3Q+PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9maWVsZGluZm8vZmllbGRpbmZvLmh0bWxcIixcIjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1pbmZvXFxcIj48c3BhbiBjbGFzcz1cXFwiaGZsZXggZnVsbC13aWR0aFxcXCIgbmctY2xpY2s9XFxcImNsaWNrZWQoJGV2ZW50KVxcXCI+PHNwYW4gY2xhc3M9XFxcInR5cGUtY2FyZXRcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiAhZGlzYWJsZUNhcmV0fVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd25cXFwiIG5nLXNob3c9XFxcInNob3dDYXJldFxcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwidHlwZSBmYSB7e2ljb259fVxcXCIgbmctc2hvdz1cXFwic2hvd1R5cGVcXFwiIHRpdGxlPVxcXCJ7e3R5cGVOYW1lfX1cXFwiPjwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gbmctaWY9XFxcImZ1bmMoZmllbGREZWYpXFxcIiBjbGFzcz1cXFwiZmllbGQtZnVuY1xcXCIgdGl0bGU9XFxcInt7IGZ1bmMoZmllbGREZWYpIH19XFxcIiBuZy1jbGFzcz1cXFwie2FueTogZmllbGREZWYuX2FueX1cXFwiPnt7IGZ1bmMoZmllbGREZWYpIH19PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIiBuZy1jbGFzcz1cXFwie2hhc2Z1bmM6IGZ1bmMoZmllbGREZWYpLCBhbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyAoZmllbGREZWYudGl0bGUgfHwgZmllbGRUaXRsZShmaWVsZERlZi5maWVsZCkpIHwgdW5kZXJzY29yZTJzcGFjZSB9fTwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIndpbGRjYXJkLWZpZWxkLWNvdW50XFxcIj57eyBmaWVsZENvdW50KGZpZWxkRGVmLmZpZWxkKSB9fTwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGU9PT1cXCdjb3VudFxcJyB8fCBmaWVsZERlZi5hdXRvQ291bnRcXFwiIGNsYXNzPVxcXCJmaWVsZC1jb3VudCBmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIj5DT1VOVDwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgcmVtb3ZlXFxcIiBuZy1zaG93PVxcXCJzaG93UmVtb3ZlXFxcIj48YSBjbGFzcz1cXFwicmVtb3ZlLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvYT48L3NwYW4+PHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwibm8tc2hyaW5rIGZpbHRlclxcXCIgbmctc2hvdz1cXFwic2hvd0ZpbHRlclxcXCI+PGEgY2xhc3M9XFxcImZpbHRlci1maWVsZFxcXCIgbmctY2xpY2s9XFxcImZpbHRlckFjdGlvbigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+PC9hPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayBhZGRcXFwiIG5nLXNob3c9XFxcInNob3dBZGRcXFwiPjxhIGNsYXNzPVxcXCJhZGQtZmllbGRcXFwiIG5nLWNsaWNrPVxcXCJhZGRBY3Rpb24oKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L2E+PC9zcGFuPjwvc3Bhbj48L3NwYW4+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9maWx0ZXIvY2F0ZWdvcmljYWxmaWx0ZXIuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiY2F0ZWdvcmljYWwtZmlsdGVyLWJveCBmaWx0ZXItYm94XFxcIj48ZGl2IGNsYXNzPVxcXCJhY3Rpb25zXFxcIj48ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PGEgbmctY2xpY2s9XFxcInNlbGVjdEFsbCgpXFxcIj5BbGw8L2E+IDxhIG5nLWNsaWNrPVxcXCJzZWxlY3ROb25lKClcXFwiPk5vbmU8L2E+PC9kaXY+U2VsZWN0ZWQge3tmaWx0ZXIuaW4ubGVuZ3RofX0ve3t2YWx1ZXMubGVuZ3RofX08L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2YWx1ZXNcXFwiPjxkaXYgbmctcmVwZWF0PVxcXCJ2YWwgaW4gdmFsdWVzXFxcIj48bGFiZWw+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBuZy1tb2RlbD1cXFwiaW5jbHVkZVt2YWxdXFxcIiBuZy1jaGFuZ2U9XFxcImZpbHRlckNoYW5nZSgpXFxcIj4ge3t2YWx9fTwvbGFiZWw+PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9maWx0ZXIvZmlsdGVyc2hlbHZlcy5odG1sXCIsXCI8YSBjbGFzcz1cXFwicmlnaHRcXFwiIG5nLWNsaWNrPVxcXCJjbGVhckZpbHRlcigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXJhc2VyXFxcIj48L2k+IENsZWFyPC9hPjxoMj5GaWx0ZXI8L2gyPjxkaXYgY2xhc3M9XFxcInNoZWxmLWdyb3VwXFxcIiBuZy1yZXBlYXQ9XFxcIihmaWVsZCwgZmlsdGVyKSBpbiBmaWx0ZXJNYW5hZ2VyLmZpbHRlckluZGV4XFxcIiBuZy1pZj1cXFwiZmlsdGVyLmVuYWJsZWRcXFwiPjxkaXYgY2xhc3M9XFxcInNoZWxmIGZpbHRlci1zaGVsZlxcXCI+PGRpdiBjbGFzcz1cXFwiZmllbGQtZHJvcFxcXCI+PGZpZWxkLWluZm8gbmctY2xhc3M9XFxcIntleHBhbmRlZDogZnVuY3NFeHBhbmRlZH1cXFwiIGZpZWxkLWRlZj1cXFwie2ZpZWxkOiBmaWVsZH1cXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgc2hvdy1yZW1vdmU9XFxcInRydWVcXFwiIHJlbW92ZS1hY3Rpb249XFxcInJlbW92ZUZpbHRlcihmaWVsZClcXFwiIGNsYXNzPVxcXCJzZWxlY3RlZCBkcmFnZ2FibGUgZnVsbC13aWR0aFxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxjYXRlZ29yaWNhbC1maWx0ZXIgZmllbGQ9XFxcImZpZWxkXFxcIiBmaWx0ZXI9XFxcImZpbHRlclxcXCIgbmctaWY9XFxcIkRhdGFzZXQuc2NoZW1hLnR5cGUoZmllbGQpID09PSBcXCdub21pbmFsXFwnIHx8IERhdGFzZXQuc2NoZW1hLnR5cGUoZmllbGQpID09PSBcXCdvcmRpbmFsXFwnXFxcIj48L2NhdGVnb3JpY2FsLWZpbHRlcj48cXVhbnRpdGF0aXZlLWZpbHRlciBmaWVsZD1cXFwiZmllbGRcXFwiIGZpbHRlcj1cXFwiZmlsdGVyXFxcIiBuZy1pZj1cXFwiRGF0YXNldC5zY2hlbWEudHlwZShmaWVsZCkgPT09IFxcJ3F1YW50aXRhdGl2ZVxcJ1xcXCI+PC9xdWFudGl0YXRpdmUtZmlsdGVyPjxkaXYgZmllbGQ9XFxcImZpZWxkXFxcIiBmaWx0ZXI9XFxcImZpbHRlclxcXCIgbmctaWY9XFxcIkRhdGFzZXQuc2NoZW1hLnR5cGUoZmllbGQpID09PSBcXCd0ZW1wb3JhbFxcJ1xcXCI+e3tmaWVsZH19IGlzIGEgdGVtcG9yYWwgZmllbGQgYW5kIHdlIGRvIG5vdCBzdXBwb3J0IGZpbHRlciBmb3IgdGVtcG9yYWwgZmllbGQgeWV0LjwvZGl2PjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvZmlsdGVyL3F1YW50aXRhdGl2ZWZpbHRlci5odG1sXCIsXCI8ZGl2PjxkaXY+PHNwYW4gY2xhc3M9XFxcInJpZ2h0IGRvbWFpbi1sYWJlbFxcXCI+e3tkb21haW5NYXh9fTwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcImRvbWFpbi1sYWJlbFxcXCI+e3tkb21haW5NaW59fTwvc3Bhbj48L2Rpdj48ZGl2IHJhbmdlLXNsaWRlcj1cXFwiXFxcIiBtaW49XFxcImRvbWFpbk1pblxcXCIgXFxcIj1cXFwiXFxcIiBtYXg9XFxcImRvbWFpbk1heFxcXCIgbW9kZWwtbWluPVxcXCJmaWx0ZXIucmFuZ2VbMF1cXFwiIG1vZGVsLW1heD1cXFwiZmlsdGVyLnJhbmdlWzFdXFxcIiBzaG93LXZhbHVlcz1cXFwidHJ1ZVxcXCIgYXR0YWNoLWhhbmRsZS12YWx1ZXM9XFxcInRydWVcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvZnVuY3Rpb25zZWxlY3QvZnVuY3Rpb25zZWxlY3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZnVuY3Rpb24tc2VsZWN0IG1iNVxcXCIgbmctaWY9XFxcImZ1bmMubGlzdC5hYm92ZUZvbGQubGVuZ3RoID4gMSB8fCBmdW5jLmxpc3QuYWJvdmVGb2xkWzBdICE9PSB1bmRlZmluZWRcXFwiIG5nLWNsYXNzPVxcXCJ7d2lsZGNhcmQ6IGZ1bmMuaXNBbnl9XFxcIj48ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCIgbmctaWY9XFxcInN1cHBvcnRBbnlcXFwiPjxsYWJlbD48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIG5nLW1vZGVsPVxcXCJmdW5jLmlzQW55XFxcIiBuZy1jaGFuZ2U9XFxcImlzQW55Q2hhbmdlZCgpXFxcIj4gV2lsZGNhcmQ8L2xhYmVsPjwvZGl2PjxoND5GdW5jdGlvbjwvaDQ+PGRpdiBjbGFzcz1cXFwicmFkaW9zXFxcIiBuZy1pZj1cXFwiIWZ1bmMuaXNBbnkgfHwgIXN1cHBvcnRBbnlcXFwiPjxkaXY+PGxhYmVsIGNsYXNzPVxcXCJmdW5jLWxhYmVsIGZpZWxkLWZ1bmNcXFwiIG5nLXJlcGVhdD1cXFwiZiBpbiBmdW5jLmxpc3QuYWJvdmVGb2xkXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJmXFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5zZWxlY3RlZFxcXCIgbmctY2hhbmdlPVxcXCJzZWxlY3RDaGFuZ2VkKClcXFwiPiB7e2YgfHwgXFwnTk9ORVxcJ319PC9sYWJlbD48L2Rpdj48ZGl2IG5nLXNob3c9XFxcInNob3dBbGxGdW5jdGlvbnNcXFwiPjxsYWJlbCBjbGFzcz1cXFwiZnVuYy1sYWJlbCBmaWVsZC1mdW5jXFxcIiBuZy1jbGFzcz1cXFwie1xcJ3NpbmdsZS1jb2x1bW5cXCc6IGZ1bmMuaXNUZW1wb3JhbH1cXFwiIG5nLXJlcGVhdD1cXFwiZiBpbiBmdW5jLmxpc3QuYmVsb3dGb2xkXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJmXFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5zZWxlY3RlZFxcXCIgbmctY2hhbmdlPVxcXCJzZWxlY3RDaGFuZ2VkKClcXFwiPiB7e2Z9fTwvbGFiZWw+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY2hlY2tib3hlc1xcXCIgbmctaWY9XFxcImZ1bmMuaXNBbnkgJiYgc3VwcG9ydEFueVxcXCI+PGRpdj48bGFiZWwgY2xhc3M9XFxcImZ1bmMtbGFiZWwgZmllbGQtZnVuY1xcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5hYm92ZUZvbGRcXFwiPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImZ1bmMuY2hlY2tlZFtmXVxcXCIgbmctY2hhbmdlPVxcXCJjaGVja0NoYW5nZWQoKVxcXCI+IHt7ZiB8fCBcXCdOT05FXFwnfX08L2xhYmVsPjwvZGl2PjxkaXYgbmctc2hvdz1cXFwic2hvd0FsbEZ1bmN0aW9uc1xcXCI+PGxhYmVsIGNsYXNzPVxcXCJmdW5jLWxhYmVsIGZpZWxkLWZ1bmNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnc2luZ2xlLWNvbHVtblxcJzogZnVuYy5pc1RlbXBvcmFsfVxcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5iZWxvd0ZvbGRcXFwiPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImZ1bmMuY2hlY2tlZFtmXVxcXCIgbmctY2hhbmdlPVxcXCJjaGVja0NoYW5nZWQoKVxcXCI+IHt7Zn19PC9sYWJlbD48L2Rpdj48L2Rpdj48ZGl2IG5nLWhpZGU9XFxcImZ1bmMuaXNDb3VudCB8fCBmdW5jLmxpc3QuYmVsb3dGb2xkLmxlbmd0aCA9PSAwXFxcIiBjbGFzcz1cXFwiZXhwYW5kLWNvbGxhcHNlXFxcIj48YSBuZy1jbGljaz1cXFwic2hvd0FsbEZ1bmN0aW9ucz0hc2hvd0FsbEZ1bmN0aW9uc1xcXCI+PHNwYW4gbmctc2hvdz1cXFwiIXNob3dBbGxGdW5jdGlvbnNcXFwiPm1vcmUgPGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd25cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+PC9zcGFuPiA8c3BhbiBuZy1zaG93PVxcXCJzaG93QWxsRnVuY3Rpb25zXFxcIj5sZXNzIDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS11cFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvaT48L3NwYW4+PC9hPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvbW9kYWwvbW9kYWwuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibW9kYWxcXFwiIG5nLWlmPVxcXCJpc09wZW5cXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLXdyYXBwZXJcXFwiIHN0eWxlPVxcXCJ7e3dyYXBwZXJTdHlsZX19XFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PGEgbmctY2xpY2s9XFxcImNsb3NlTW9kYWwoKVxcXCIgY2xhc3M9XFxcInJpZ2h0XFxcIj5DbG9zZTwvYT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmh0bWxcIixcIjxkaXY+PGxhYmVsIGNsYXNzPVxcXCJwcm9wLWxhYmVsXFxcIiBmb3I9XFxcInt7IGlkIH19XFxcIj48c3BhbiBjbGFzcz1cXFwibmFtZVxcXCIgdGl0bGU9XFxcInt7IHByb3BOYW1lIH19XFxcIj57eyBwcm9wTmFtZSB9fTwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImRlc2NyaXB0aW9uXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPHN0cm9uZz57eyBwcm9wTmFtZSB9fTwvc3Ryb25nPjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPnt7IGRlc2NyaXB0aW9uIH19PC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L3NwYW4+PC9sYWJlbD48Zm9ybSBjbGFzcz1cXFwiaW5saW5lLWJsb2NrXFxcIiBuZy1zd2l0Y2g9XFxcInR5cGUgKyAoZW51bSAhPT0gdW5kZWZpbmVkID8gXFwnbGlzdFxcJyA6IFxcJ1xcJylcXFwiPjxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJib29sZWFuXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImdyb3VwW3Byb3BOYW1lXVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIj48c2VsZWN0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctc3dpdGNoLXdoZW49XFxcInN0cmluZ2xpc3RcXFwiIG5nLW1vZGVsPVxcXCJncm91cFtwcm9wTmFtZV1cXFwiIG5nLW9wdGlvbnM9XFxcImNob2ljZSBmb3IgY2hvaWNlIGluIGVudW0gdHJhY2sgYnkgY2hvaWNlXFxcIiBuZy1oaWRlPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiPjwvc2VsZWN0PjxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJpbnRlZ2VyXFxcIiBuZy1hdHRyLXR5cGU9XFxcInt7IGlzUmFuZ2UgPyBcXCdyYW5nZVxcJyA6IFxcJ251bWJlclxcJ319XFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7ZGVib3VuY2U6IDIwMH1cXFwiIG5nLWF0dHItbWluPVxcXCJ7e21pbn19XFxcIiBuZy1hdHRyLW1heD1cXFwie3ttYXh9fVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIiBuZy1hdHRyLXRpdGxlPVxcXCJ7eyBpc1JhbmdlID8gZ3JvdXBbcHJvcE5hbWVdIDogdW5kZWZpbmVkIH19XFxcIj4gPGlucHV0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctYXR0ci10eXBlPVxcXCJ7eyByb2xlID09PSBcXCdjb2xvclxcJyA/IFxcJ2NvbG9yXFwnIDogXFwnc3RyaW5nXFwnIH19XFxcIiBuZy1zd2l0Y2gtd2hlbj1cXFwic3RyaW5nXFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7ZGVib3VuY2U6IDUwMH1cXFwiIG5nLWhpZGU9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCI+IDxzbWFsbCBuZy1pZj1cXFwiaGFzQXV0b1xcXCI+PGxhYmVsPkF1dG8gPGlucHV0IG5nLW1vZGVsPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIj48L2xhYmVsPjwvc21hbGw+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvc2NoZW1hbGlzdC9zY2hlbWFsaXN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInNjaGVtYSBuby10b3AtbWFyZ2luIGZ1bGwtd2lkdGhcXFwiPjxzY2hlbWEtbGlzdC1pdGVtIG5nLXJlcGVhdD1cXFwiZmllbGREZWYgaW4gZmllbGREZWZzIHwgb3JkZXJCeSA6IG9yZGVyQnlcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIGZpbHRlci1tYW5hZ2VyPVxcXCJmaWx0ZXJNYW5hZ2VyXFxcIiBzaG93LWFkZD1cXFwic2hvd0FkZFxcXCI+PC9zY2hlbWEtbGlzdC1pdGVtPjxzY2hlbWEtbGlzdC1pdGVtIG5nLWlmPVxcXCJzaG93Q291bnRcXFwiIGZpZWxkLWRlZj1cXFwiY291bnRGaWVsZERlZlxcXCIgc2hvdy1hZGQ9XFxcInRydWVcXFwiPjwvc2NoZW1hLWxpc3QtaXRlbT48ZGl2IGNsYXNzPVxcXCJzY2hlbWEtbGlzdC1kcm9wXFxcIiBuZy1zaG93PVxcXCJzaG93RHJvcFxcXCIgbmctbW9kZWw9XFxcImRyb3BwZWRGaWVsZERlZlxcXCIgZGF0YS1kcm9wPVxcXCJ0cnVlXFxcIiBqcXlvdWktZHJvcHBhYmxlPVxcXCJ7b25Ecm9wOlxcJ2ZpZWxkRHJvcHBlZFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcInthY3RpdmVDbGFzczogXFwnZHJvcC1hY3RpdmVcXCd9XFxcIj5DcmVhdGUgYSBuZXcgd2lsZGNhcmQuPC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInNjaGVtYS1saXN0LWl0ZW1cXFwiIG5nLW1vZGVsPVxcXCJkcm9wcGVkRmllbGREZWZcXFwiIGRhdGEtZHJvcD1cXFwiaXNBbnlGaWVsZCAmJiBmaWVsZERlZi5maWVsZCAhPT0gXFwnP1xcJ1xcXCIganF5b3VpLWRyb3BwYWJsZT1cXFwie29uRHJvcDpcXCdmaWVsZERyb3BwZWRcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7YWN0aXZlQ2xhc3M6IFxcJ2Ryb3AtYWN0aXZlXFwnfVxcXCI+PGZpZWxkLWluZm8gbmctc2hvdz1cXFwiIWlzQW55RmllbGQgfHwgZmllbGREZWYuZmllbGQgPT09IFxcJz9cXCcgfHwgZmllbGREZWYuZmllbGQuZW51bS5sZW5ndGggPiAwXFxcIiBjbGFzcz1cXFwicGlsbCBkcmFnZ2FibGUgZnVsbC13aWR0aCBuby1yaWdodC1tYXJnaW5cXFwiIG5nLWNsYXNzPVxcXCJ7YW55OiBpc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKX1cXFwiIG5nLWRibGNsaWNrPVxcXCJmaWVsZEFkZChmaWVsZERlZilcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIG5nLW1vZGVsPVxcXCJwaWxsXFxcIiBkYXRhLWRyYWc9XFxcInRydWVcXFwiIGpxeW91aS1kcmFnZ2FibGU9XFxcIntwbGFjZWhvbGRlcjogXFwna2VlcFxcJywgZGVlcENvcHk6IHRydWUsIG9uU3RhcnQ6IFxcJ2ZpZWxkRHJhZ1N0YXJ0XFwnLCBvblN0b3A6XFwnZmllbGREcmFnU3RvcFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcIntyZXZlcnQ6IFxcJ2ludmFsaWRcXCcsIGhlbHBlcjogXFwnY2xvbmVcXCd9XFxcIiBzaG93LWFkZD1cXFwic2hvd0FkZFxcXCIgc2hvdy1jYXJldD1cXFwidHJ1ZVxcXCIgZGlzYWJsZS1jYXJldD1cXFwiZmllbGREZWYuaW1tdXRhYmxlIHx8IGZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gXFwnY291bnRcXCcgfHwgYWxsb3dlZFR5cGVzLmxlbmd0aDw9MVxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBhZGQtYWN0aW9uPVxcXCJmaWVsZEFkZChmaWVsZERlZilcXFwiIHNob3ctZmlsdGVyPVxcXCIhIWZpbHRlck1hbmFnZXJcXFwiIGZpbHRlci1hY3Rpb249XFxcInRvZ2dsZUZpbHRlcigpXFxcIiB1c2UtdGl0bGU9XFxcInRydWVcXFwiIHBvcHVwLWNvbnRlbnQ9XFxcImZpZWxkSW5mb1BvcHVwQ29udGVudFxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxkaXYgY2xhc3M9XFxcImRyb3AtY29udGFpbmVyXFxcIj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHNjaGVtYS1tZW51XFxcIiBuZy1oaWRlPVxcXCIhYWxsb3dlZFR5cGVzIHx8IGFsbG93ZWRUeXBlcy5sZW5ndGg8PTFcXFwiPjxkaXYgY2xhc3M9XFxcIm1iNSBmaWVsZC10eXBlXFxcIiBuZy1pZj1cXFwiYWxsb3dlZFR5cGVzLmxlbmd0aD4xICYmICFpc0FueUZpZWxkXFxcIj48aDQ+VHlwZTwvaDQ+PGxhYmVsIGNsYXNzPVxcXCJ0eXBlLWxhYmVsXFxcIiBuZy1yZXBlYXQ9XFxcInR5cGUgaW4gYWxsb3dlZFR5cGVzXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJ0eXBlXFxcIiBuZy1tb2RlbD1cXFwiZmllbGREZWYudHlwZVxcXCI+IHt7dHlwZX19PC9sYWJlbD48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ3aWxkY2FyZC1tZW51XFxcIiBuZy1zaG93PVxcXCJpc0FueUZpZWxkICYmIGZpZWxkRGVmLmZpZWxkLmVudW1cXFwiPjxkaXY+PGxhYmVsIGNsYXNzPVxcXCJ3aWxkY2FyZC10aXRsZS1sYWJlbFxcXCI+PGg0Pk5hbWU8L2g0PjxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuZy1tb2RlbD1cXFwiZmllbGREZWYudGl0bGVcXFwiIHBsYWNlaG9sZGVyPVxcXCJFbnRlciBuYW1lIGhlcmVcXFwiPjwvbGFiZWw+PC9kaXY+PGg0PldpbGRjYXJkIEZpZWxkczwvaDQ+PGRpdiBjbGFzcz1cXFwid2lsZGNhcmQtZmllbGRzXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkIGluIGZpZWxkRGVmLmZpZWxkLmVudW1cXFwiIGNsYXNzPVxcXCJwaWxsIGxpc3QtaXRlbSBmdWxsLXdpZHRoIG5vLXJpZ2h0LW1hcmdpblxcXCIgZmllbGQtZGVmPVxcXCJmaWVsZCA9PT0gXFwnKlxcJyA/IGNvdW50RmllbGREZWYgOiBEYXRhc2V0LnNjaGVtYS5maWVsZFNjaGVtYShmaWVsZClcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgc2hvdy1yZW1vdmU9XFxcInRydWVcXFwiIHJlbW92ZS1hY3Rpb249XFxcInJlbW92ZVdpbGRjYXJkRmllbGQoJGluZGV4KVxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxhIGNsYXNzPVxcXCJyZW1vdmUtYWN0aW9uXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlV2lsZGNhcmQoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+IERlbGV0ZSBXaWxkY2FyZDwvYT48L2Rpdj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjYXJkIHNoZWx2ZXMgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW4gYWJzLTEwMFxcXCI+PGEgY2xhc3M9XFxcInJpZ2h0XFxcIiBuZy1jbGljaz1cXFwiY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWVyYXNlclxcXCI+PC9pPiBDbGVhcjwvYT48aDI+RW5jb2Rpbmc8L2gyPjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtZW5jb2RpbmctcGFuZSBmdWxsLXdpZHRoXFxcIj48aDM+UG9zaXRpb25hbDwvaDM+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwneFxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCd5XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgc3VwcG9ydC1hbnk9XFxcInN1cHBvcnRBbnlcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ2NvbHVtblxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiIGRpc2FibGVkPVxcXCIhc3BlYy5lbmNvZGluZy54LmZpZWxkXFxcIj4+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3Jvd1xcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiIGRpc2FibGVkPVxcXCIhc3BlYy5lbmNvZGluZy55LmZpZWxkXFxcIj48L2NoYW5uZWwtc2hlbGY+PC9kaXY+PGRpdiBjbGFzcz1cXFwic2hlbGYtcGFuZSBzaGVsZi1tYXJrcy1wYW5lIGZ1bGwtd2lkdGhcXFwiPjxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIj48c2VsZWN0IGNsYXNzPVxcXCJtYXJrc2VsZWN0XFxcIiBuZy1tb2RlbD1cXFwic3BlYy5tYXJrXFxcIiBuZy1jbGFzcz1cXFwie2F1dG86IHNwZWMubWFyayA9PT0gQU5ZfVxcXCIgbmctb3B0aW9ucz1cXFwiKHR5cGUgPT09IEFOWSA/IFxcJ2F1dG9cXCcgOiB0eXBlKSBmb3IgdHlwZSBpbiAoc3VwcG9ydEFueSB8fCBzdXBwb3J0QXV0b01hcmsgPyBtYXJrc1dpdGhBbnkgOiBtYXJrcylcXFwiIG5nLWNoYW5nZT1cXFwibWFya0NoYW5nZSgpXFxcIj48L3NlbGVjdD48L2Rpdj48aDM+TWFya3M8L2gzPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3NpemVcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnY29sb3JcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnc2hhcGVcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnZGV0YWlsXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgc3VwcG9ydC1hbnk9XFxcInN1cHBvcnRBbnlcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3RleHRcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PC9kaXY+PGRpdiBjbGFzcz1cXFwic2hlbGYtcGFuZSBzaGVsZi1hbnktcGFuZSBmdWxsLXdpZHRoXFxcIiBuZy1pZj1cXFwic3VwcG9ydEFueSAmJiAhcHJldmlld1xcXCI+PGgzPkF1dG9tYXRpYzwvaDM+PGNoYW5uZWwtc2hlbGYgbmctcmVwZWF0PVxcXCJjaGFubmVsSWQgaW4gYW55Q2hhbm5lbElkc1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgY2hhbm5lbC1pZD1cXFwiY2hhbm5lbElkXFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgc3VwcG9ydC1hbnk9XFxcInN1cHBvcnRBbnlcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtZmlsdGVyLXBhbmUgZnVsbC13aWR0aFxcXCIgbmctaWY9XFxcIiFwcmV2aWV3XFxcIj48ZmlsdGVyLXNoZWx2ZXM+PC9maWx0ZXItc2hlbHZlcz48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3RhYnMvdGFiLmh0bWxcIixcIjxkaXYgbmctaWY9XFxcImFjdGl2ZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3RhYnMvdGFic2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInRhYi1jb250YWluZXJcXFwiPjxkaXY+PGEgY2xhc3M9XFxcInRhYlxcXCIgbmctcmVwZWF0PVxcXCJ0YWIgaW4gdGFic2V0LnRhYnNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnYWN0aXZlXFwnOiB0YWIuYWN0aXZlfVxcXCIgbmctY2xpY2s9XFxcInRhYnNldC5zaG93VGFiKHRhYilcXFwiPnt7dGFiLmhlYWRpbmd9fTwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0YWItY29udGVudHNcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3RcXFwiIGlkPVxcXCJ2aXMte3t2aXNJZH19XFxcIiBuZy1jbGFzcz1cXFwieyBmaXQ6ICFhbHdheXNTY3JvbGxhYmxlICYmICFvdmVyZmxvdyAmJiBoZWlnaHQgPiB2bFBsb3RIZWlnaHQoKSAmJiB3aWR0aCA+IHZsUGxvdFdpZHRoKCksIFxcJ292ZXJmbG93LXlcXCc6IChhbHdheXNTY3JvbGxhYmxlIHx8IG92ZXJmbG93KSAmJiBoZWlnaHQgPiB2bFBsb3RIZWlnaHQoKSwgXFwnb3ZlcmZsb3cteFxcJzogKGFsd2F5c1Njcm9sbGFibGUgfHwgb3ZlcmZsb3cpICYmIHdpZHRoID4gdmxQbG90V2lkdGgoKSwgc2Nyb2xsOiBhbHdheXNTY3JvbGxhYmxlIHx8IHVubG9ja2VkIHx8IGhvdmVyRm9jdXMgfVxcXCIgbmctbW91c2Vkb3duPVxcXCJ1bmxvY2tlZD0hdGh1bWJuYWlsXFxcIiBuZy1tb3VzZXVwPVxcXCJ1bmxvY2tlZD1mYWxzZVxcXCIgbmctbW91c2VlbnRlcj1cXFwibW91c2VlbnRlcigpXFxcIiBuZy1tb3VzZWxlYXZlPVxcXCJtb3VzZWxlYXZlKClcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cCB2ZmxleFxcXCIgbmctZGJsY2xpY2s9XFxcInNlbGVjdChjaGFydClcXFwiPjxkaXYgbmctc2hvdz1cXFwic2hvd0V4cGFuZCB8fCBmaWVsZFNldCB8fCBzaG93VHJhbnNwb3NlIHx8IHNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWQgfHwgc2hvd1RvZ2dsZVxcXCIgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAtaGVhZGVyIG5vLXNocmlua1xcXCI+PGRpdiBjbGFzcz1cXFwiZmllbGQtc2V0LWluZm9cXFwiIG5nLW1vdXNlZW50ZXI9XFxcImVuYWJsZVByZXZpZXcoKVxcXCIgbmctbW91c2VsZWF2ZT1cXFwiZGlzYWJsZVByZXZpZXcoKVxcXCI+PGZpZWxkLWluZm8gbmctcmVwZWF0PVxcXCJmaWVsZERlZiBpbiBmaWVsZFNldFxcXCIgbmctaWY9XFxcImZpZWxkU2V0ICYmIChmaWVsZERlZi5maWVsZCB8fCBmaWVsZERlZi5hdXRvQ291bnQpXFxcIiBmaWVsZC1kZWY9XFxcImZpZWxkRGVmXFxcIiBlbnVtLXNwZWMtaW5kZXg9XFxcImNoYXJ0LmVudW1TcGVjSW5kZXhcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgbmctY2xhc3M9XFxcInsgc2VsZWN0ZWQ6IGFsd2F5c1NlbGVjdGVkIHx8IChpc1NlbGVjdGVkICYmIGlzU2VsZWN0ZWQoZmllbGREZWYuZmllbGQpKSwgdW5zZWxlY3RlZDogaXNTZWxlY3RlZCAmJiAhaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCksIGhpZ2hsaWdodGVkOiAoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0sIFxcJ2VudW1lcmF0ZWQtZmllbGRcXCc6IGlzRW51bWVyYXRlZEZpZWxkKGNoYXJ0LCAkaW5kZXgpLCBcXCdlbnVtZXJhdGVkLWNoYW5uZWxcXCc6IGlzRW51bWVyYXRlZENoYW5uZWwoY2hhcnQsICRpbmRleCkgfVxcXCIgbmctbW91c2VlbnRlcj1cXFwiZmllbGRJbmZvTW91c2VvdmVyKGZpZWxkRGVmLCAkaW5kZXgpXFxcIiBuZy1tb3VzZWxlYXZlPVxcXCJmaWVsZEluZm9Nb3VzZW91dChmaWVsZERlZiwgJGluZGV4KVxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxkaXYgc3R5bGU9XFxcImZsZXgtZ3JvdzoxXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0b29sYm94XFxcIj48YSBuZy1pZj1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1Z1xcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS13cmVuY2hcXFwiIG5nLWNsaWNrPVxcXCJzaENvcGllZD1cXCdcXCc7IHZsQ29waWVkPVxcJ1xcJzsgdmdDb3BpZWQ9XFwnXFwnO1xcXCIgbmctbW91c2VvdmVyPVxcXCJpbml0aWFsaXplUG9wdXAoKTtcXFwiPjwvaT48L2E+PHZsLXBsb3QtZ3JvdXAtcG9wdXAgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWcgJiYgcmVuZGVyUG9wdXBcXFwiPjwvdmwtcGxvdC1ncm91cC1wb3B1cD48YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIHRpdGxlPVxcXCJUb2dnbGUgWC1TY2FsZVxcXCIgbmctY2xpY2s9XFxcImxvZy50b2dnbGUoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGxvZy5hY3RpdmUoY2hhcnQudmxTcGVjLCBcXCd4XFwnKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXJpZ2h0XFxcIj48L2k+IDxzbWFsbD5Mb2cgWDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd5XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIHRpdGxlPVxcXCJUb2dnbGUgWS1TY2FsZVxcXCIgbmctY2xpY2s9XFxcImxvZy50b2dnbGUoY2hhcnQudmxTcGVjLCBcXCd5XFwnKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGxvZy5hY3RpdmUoY2hhcnQudmxTcGVjLCBcXCd5XFwnKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXVwXFxcIj48L2k+IDxzbWFsbD5Mb2cgWTwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1NvcnQgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZVNvcnQuc3VwcG9ydChjaGFydC52bFNwZWMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZVNvcnQudG9nZ2xlKGNoYXJ0LnZsU3BlYylcXFwiIHRpdGxlPVxcXCJTb3J0XFxcIj48aSBjbGFzcz1cXFwiZmEgc29ydFxcXCIgbmctY2xhc3M9XFxcInRvZ2dsZVNvcnRDbGFzcyhjaGFydC52bFNwZWMpXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Tb3J0PC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RmlsdGVyTnVsbCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlRmlsdGVyTnVsbC5zdXBwb3J0KGNoYXJ0LnZsU3BlYylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlRmlsdGVyTnVsbChjaGFydC52bFNwZWMpXFxcIiB0aXRsZT1cXFwiRmlsdGVyIE51bGxcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBjaGFydC52bFNwZWMgJiYgKGNoYXJ0LnZsU3BlYy50cmFuc2Zvcm18fHt9KS5maWx0ZXJJbnZhbGlkfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWZpbHRlclxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+RmlsdGVyPC9zbWFsbD4gPHNtYWxsPk5VTEw8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dUcmFuc3Bvc2VcXFwiIHRpdGxlPVxcXCJTd2FwIFgvWVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0cmFuc3Bvc2UoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXJlZnJlc2ggdHJhbnNwb3NlXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Td2FwIFgvWTwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIHRpdGxlPVxcXCJCb29rbWFya1xcXCIgbmctY2xpY2s9XFxcInRvZ2dsZUJvb2ttYXJrKGNoYXJ0KVxcXCIgbmctY2xhc3M9XFxcIntkaXNhYmxlZDogIWNoYXJ0LnZsU3BlYy5lbmNvZGluZywgYWN0aXZlOiBCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZCl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYm9va21hcmtcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkJvb2ttYXJrPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RXhwYW5kXFxcIiBuZy1jbGljaz1cXFwiZXhwYW5kQWN0aW9uKClcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1NlbGVjdFxcXCIgdGl0bGU9XFxcIlNldCBlbmNvZGluZyB0byB0aGlzIGNoYXJ0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0KGNoYXJ0KVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgc2VsZWN0XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VydmVyXFxcIj48L2k+PC9hPjxkaXYgbmctaWY9XFxcInNob3dCb29rbWFya0FsZXJ0XFxcIiBjbGFzcz1cXFwiYm9va21hcmstYWxlcnRcXFwiPjxkaXY+UmVtb3ZlIGJvb2ttYXJrPzwvZGl2PjxzbWFsbD5Zb3VyIG5vdGVzIHdpbGwgYmUgbG9zdC48L3NtYWxsPjxkaXY+PGEgbmctY2xpY2s9XFxcInJlbW92ZUJvb2ttYXJrKGNoYXJ0KVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gcmVtb3ZlIGl0PC9hPiA8YSBuZy1jbGljaz1cXFwia2VlcEJvb2ttYXJrKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiBrZWVwIGl0PC9hPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2Pjx2bC1wbG90IGNsYXNzPVxcXCJmbGV4LWdyb3ctMVxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBkaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBsaXN0LXRpdGxlPVxcXCJsaXN0VGl0bGVcXFwiIGFsd2F5cy1zY3JvbGxhYmxlPVxcXCJhbHdheXNTY3JvbGxhYmxlXFxcIiBjb25maWctc2V0PVxcXCJ7e2NvbmZpZ1NldHx8XFwnc21hbGxcXCd9fVxcXCIgb3ZlcmZsb3c9XFxcIm92ZXJmbG93XFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHlcXFwiIHJlc2NhbGU9XFxcInJlc2NhbGVcXFwiIHRodW1ibmFpbD1cXFwidGh1bWJuYWlsXFxcIiB0b29sdGlwPVxcXCJ0b29sdGlwXFxcIj48L3ZsLXBsb3Q+PHRleHRhcmVhIGNsYXNzPVxcXCJhbm5vdGF0aW9uXFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpXFxcIiBuZy1tb2RlbD1cXFwiQm9va21hcmtzLmRpY3RbY2hhcnQuc2hvcnRoYW5kXS5hbm5vdGF0aW9uXFxcIiBuZy1jaGFuZ2U9XFxcIkJvb2ttYXJrcy5zYXZlQW5ub3RhdGlvbnMoY2hhcnQuc2hvcnRoYW5kKVxcXCIgcGxhY2Vob2xkZXI9XFxcIm5vdGVzXFxcIj48L3RleHRhcmVhPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBwb3B1cC1jb21tYW5kIG5vLXNocmluayBkZXYtdG9vbFxcXCI+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbDwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZsQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuY2xlYW5TcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhLUxpdGVcXCcsIGNoYXJ0LmNsZWFuU3BlYyk7IHZsQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZsQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WZzwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZnQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQudmdTcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhXFwnLCBjaGFydC52Z1NwZWMpOyB2Z0NvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2Z0NvcGllZH19PC9zcGFuPjwvZGl2PjxhIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIiBuZy1ocmVmPVxcXCJ7eyB7dHlwZTpcXCd2bFxcJywgc3BlYzogY2hhcnQuY2xlYW5TcGVjfSB8IHJlcG9ydFVybCB9fVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlJlcG9ydCBCYWQgUmVuZGVyPC9hPiA8YSBuZy1jbGljaz1cXFwic2hvd0ZlYXR1cmU9IXNob3dGZWF0dXJlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+e3tjaGFydC5zY29yZX19PC9hPjxkaXYgbmctcmVwZWF0PVxcXCJmIGluIGNoYXJ0LnNjb3JlRmVhdHVyZXMgdHJhY2sgYnkgZi5yZWFzb25cXFwiPlt7e2Yuc2NvcmV9fV0ge3tmLnJlYXNvbn19PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cGxpc3QvdmxwbG90Z3JvdXBsaXN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAtbGlzdC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LWhlYWRlclxcXCIgbmctc2hvdz1cXFwibGlzdFRpdGxlICYmICFoaWRlTGlzdFRpdGxlXFxcIj48aDM+e3tsaXN0VGl0bGV9fTwvaDM+PHNwYW4gY2xhc3M9XFxcImRlc2NyaXB0aW9uXFxcIj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QgaGZsZXggZmxleC13cmFwXFxcIj48dmwtcGxvdC1ncm91cCBuZy1yZXBlYXQ9XFxcImNoYXJ0IGluIGNoYXJ0cyB8IGxpbWl0VG86IGxpbWl0XFxcIiBjbGFzcz1cXFwid3JhcHBlZC12bC1wbG90LWdyb3VwIGNhcmRcXFwiIGNoYXJ0PVxcXCJjaGFydFxcXCIgaXMtaW4tbGlzdD1cXFwiaXNJbkxpc3RcXFwiIGxpc3QtdGl0bGU9XFxcImxpc3RUaXRsZVxcXCIgZW5hYmxlLXBpbGxzLXByZXZpZXc9XFxcImVuYWJsZVBpbGxzUHJldmlld1xcXCIgZmllbGQtc2V0PVxcXCJjaGFydC5maWVsZFNldFxcXCIgc2hvdy1ib29rbWFyaz1cXFwidHJ1ZVxcXCIgc2hvdy1kZWJ1Zz1cXFwiY29uc3RzLmRlYnVnICYmIGNvbnN0cy5kZWJ1Z0luTGlzdFxcXCIgc2hvdy1zZWxlY3Q9XFxcInRydWVcXFwiIHNob3ctZmlsdGVyLW51bGw9XFxcInRydWVcXFwiIHNob3ctbG9nPVxcXCJ0cnVlXFxcIiBzaG93LXNvcnQ9XFxcInRydWVcXFwiIG92ZXJmbG93PVxcXCJ0cnVlXFxcIiB0b29sdGlwPVxcXCJ0cnVlXFxcIiBoaWdobGlnaHRlZD1cXFwiUGlsbHMuaGlnaGxpZ2h0ZWRcXFwiIHByaW9yaXR5PVxcXCJwcmlvcml0eSArICRpbmRleFxcXCI+PC92bC1wbG90LWdyb3VwPjwvZGl2PjxhIG5nLWNsaWNrPVxcXCJpbmNyZWFzZUxpbWl0KClcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LW1vcmVcXFwiIG5nLXNob3c9XFxcImxpbWl0IDwgY2hhcnRzLmxlbmd0aFxcXCI+TG9hZCBtb3JlLi4uPC9kaXY+PC9hPjwvZGl2PlwiKTt9XSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZE15cmlhRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGFkZE15cmlhRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZE15cmlhRGF0YXNldCcsIGZ1bmN0aW9uICgkaHR0cCwgRGF0YXNldCwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2NvcGUgdmFyaWFibGVzXG4gICAgICAgIHNjb3BlLm15cmlhUmVzdFVybCA9IGNvbnN0cy5teXJpYVJlc3Q7XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldHMgPSBbXTtcbiAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0ID0gbnVsbDtcblxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMgPSBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoc2NvcGUubXlyaWFSZXN0VXJsICsgJy9kYXRhc2V0L3NlYXJjaC8/cT0nICsgcXVlcnkpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIExvYWQgdGhlIGF2YWlsYWJsZSBkYXRhc2V0cyBmcm9tIE15cmlhXG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0cygnJyk7XG5cbiAgICAgICAgc2NvcGUub3B0aW9uTmFtZSA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC51c2VyTmFtZSArICc6JyArIGRhdGFzZXQucHJvZ3JhbU5hbWUgKyAnOicgKyBkYXRhc2V0LnJlbGF0aW9uTmFtZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24obXlyaWFEYXRhc2V0KSB7XG4gICAgICAgICAgdmFyIGRhdGFzZXQgPSB7XG4gICAgICAgICAgICBncm91cDogJ215cmlhJyxcbiAgICAgICAgICAgIG5hbWU6IG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUsXG4gICAgICAgICAgICB1cmw6IHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC91c2VyLScgKyBteXJpYURhdGFzZXQudXNlck5hbWUgK1xuICAgICAgICAgICAgICAnL3Byb2dyYW0tJyArIG15cmlhRGF0YXNldC5wcm9ncmFtTmFtZSArXG4gICAgICAgICAgICAgICcvcmVsYXRpb24tJyArIG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUgKyAnL2RhdGE/Zm9ybWF0PWpzb24nXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZFVybERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRVcmxEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkVXJsRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRoZSBkYXRhc2V0IHRvIGFkZFxuICAgICAgICBzY29wZS5hZGRlZERhdGFzZXQgPSB7XG4gICAgICAgICAgZ3JvdXA6ICd1c2VyJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZEZyb21VcmwgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1VSTCwgZGF0YXNldC51cmwpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBGZXRjaCAmIGFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6aW5Hcm91cFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgaW5Hcm91cFxuICogR2V0IGRhdGFzZXRzIGluIGEgcGFydGljdWxhciBncm91cFxuICogQHBhcmFtICB7U3RyaW5nfSBkYXRhc2V0R3JvdXAgT25lIG9mIFwic2FtcGxlLFwiIFwidXNlclwiLCBvciBcIm15cmlhXCJcbiAqIEByZXR1cm4ge0FycmF5fSBBbiBhcnJheSBvZiBkYXRhc2V0cyBpbiB0aGUgc3BlY2lmaWVkIGdyb3VwXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignaW5Hcm91cCcsIGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyLCBkYXRhc2V0R3JvdXApIHtcbiAgICAgIHJldHVybiBfLmZpbHRlcihhcnIsIHtcbiAgICAgICAgZ3JvdXA6IGRhdGFzZXRHcm91cFxuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Y2hhbmdlTG9hZGVkRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGNoYW5nZUxvYWRlZERhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdjaGFuZ2VMb2FkZWREYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIF8pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4cG9zZSBkYXRhc2V0IG9iamVjdCBpdHNlbGYgc28gY3VycmVudCBkYXRhc2V0IGNhbiBiZSBtYXJrZWRcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQuZ3JvdXAgIT09ICdzYW1wbGUnO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5zYW1wbGVEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywge1xuICAgICAgICAgIGdyb3VwOiAnc2FtcGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZGF0YXNldFdhdGNoZXIgPSBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIERhdGFzZXQuZGF0YXNldHMubGVuZ3RoO1xuICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS51c2VyRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhc2V0Lmdyb3VwICE9PSAnc2FtcGxlJztcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuc2VsZWN0RGF0YXNldCA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgc2VsZWN0ZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKGRhdGFzZXQpO1xuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlcnNcbiAgICAgICAgICBkYXRhc2V0V2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnRGF0YXNldCcsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQWxlcnRzLCBfLCB1dGlsLCB2bCwgY3FsLCBTYW1wbGVEYXRhLCBDb25maWcsIExvZ2dlcikge1xuICAgIHZhciBEYXRhc2V0ID0ge307XG5cbiAgICAvLyBTdGFydCB3aXRoIHRoZSBsaXN0IG9mIHNhbXBsZSBkYXRhc2V0c1xuICAgIHZhciBkYXRhc2V0cyA9IFNhbXBsZURhdGE7XG5cbiAgICBEYXRhc2V0LmRhdGFzZXRzID0gZGF0YXNldHM7XG4gICAgRGF0YXNldC5kYXRhc2V0ID0gZGF0YXNldHNbMV07XG4gICAgRGF0YXNldC5jdXJyZW50RGF0YXNldCA9IHVuZGVmaW5lZDsgIC8vIGRhdGFzZXQgYmVmb3JlIHVwZGF0ZVxuICAgIERhdGFzZXQuc3RhdHMgPSB7fTtcbiAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG5cbiAgICB2YXIgdHlwZU9yZGVyID0ge1xuICAgICAgbm9taW5hbDogMCxcbiAgICAgIG9yZGluYWw6IDAsXG4gICAgICBnZW9ncmFwaGljOiAyLFxuICAgICAgdGVtcG9yYWw6IDMsXG4gICAgICBxdWFudGl0YXRpdmU6IDRcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkgPSB7fTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGUgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgaWYgKGZpZWxkRGVmLmFnZ3JlZ2F0ZT09PSdjb3VudCcpIHJldHVybiA0O1xuICAgICAgcmV0dXJuIHR5cGVPcmRlcltmaWVsZERlZi50eXBlXTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIHJldHVybiBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlKGZpZWxkRGVmKSArICdfJyArXG4gICAgICAgIChmaWVsZERlZi5hZ2dyZWdhdGUgPT09ICdjb3VudCcgPyAnficgOiBmaWVsZERlZi5maWVsZC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgLy8gfiBpcyB0aGUgbGFzdCBjaGFyYWN0ZXIgaW4gQVNDSUlcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkub3JpZ2luYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAwOyAvLyBubyBzd2FwIHdpbGwgb2NjdXJcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkuZmllbGQgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgcmV0dXJuIGZpZWxkRGVmLmZpZWxkO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXIgPSBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWU7XG5cbiAgICAvLyB1cGRhdGUgdGhlIHNjaGVtYSBhbmQgc3RhdHNcbiAgICBEYXRhc2V0Lm9uVXBkYXRlID0gW107XG5cbiAgICBEYXRhc2V0LnVwZGF0ZSA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgIHZhciB1cGRhdGVQcm9taXNlO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9DSEFOR0UsIGRhdGFzZXQubmFtZSk7XG5cbiAgICAgIGlmIChkYXRhc2V0LnZhbHVlcykge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgIERhdGFzZXQudHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB1cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhc2V0LnZhbHVlcyk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkaHR0cC5nZXQoZGF0YXNldC51cmwsIHtjYWNoZTogdHJ1ZX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICB2YXIgZGF0YTtcblxuICAgICAgICAgIC8vIGZpcnN0IHNlZSB3aGV0aGVyIHRoZSBkYXRhIGlzIEpTT04sIG90aGVyd2lzZSB0cnkgdG8gcGFyc2UgQ1NWXG4gICAgICAgICAgaWYgKF8uaXNPYmplY3QocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSB1dGlsLnJlYWQocmVzcG9uc2UuZGF0YSwge3R5cGU6ICdjc3YnfSk7XG4gICAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnY3N2JztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB1cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIERhdGFzZXQub25VcGRhdGUuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gdXBkYXRlUHJvbWlzZS50aGVuKGxpc3RlbmVyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDb3B5IHRoZSBkYXRhc2V0IGludG8gdGhlIGNvbmZpZyBzZXJ2aWNlIG9uY2UgaXQgaXMgcmVhZHlcbiAgICAgIHVwZGF0ZVByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQoZGF0YXNldCwgRGF0YXNldC50eXBlKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdXBkYXRlUHJvbWlzZTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0RmllbGREZWZzKHNjaGVtYSwgb3JkZXIpIHtcbiAgICAgIHZhciBmaWVsZERlZnMgPSBzY2hlbWEuZmllbGRzKCkubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgIHR5cGU6IHNjaGVtYS50eXBlKGZpZWxkKSxcbiAgICAgICAgICBwcmltaXRpdmVUeXBlOiBzY2hlbWEucHJpbWl0aXZlVHlwZShmaWVsZClcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuXG4gICAgICBmaWVsZERlZnMgPSB1dGlsLnN0YWJsZXNvcnQoZmllbGREZWZzLCBvcmRlciB8fCBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUsIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkKTtcblxuICAgICAgZmllbGREZWZzLnB1c2goeyBmaWVsZDogJyonLCBhZ2dyZWdhdGU6IHZsLmFnZ3JlZ2F0ZS5BZ2dyZWdhdGVPcC5DT1VOVCwgdHlwZTogdmwudHlwZS5RVUFOVElUQVRJVkUsIHRpdGxlOiAnQ291bnQnIH0pO1xuICAgICAgcmV0dXJuIGZpZWxkRGVmcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhKSB7XG4gICAgICBEYXRhc2V0LmRhdGEgPSBkYXRhO1xuICAgICAgRGF0YXNldC5jdXJyZW50RGF0YXNldCA9IGRhdGFzZXQ7XG5cbiAgICAgIERhdGFzZXQuc2NoZW1hID0gY3FsLnNjaGVtYS5TY2hlbWEuYnVpbGQoZGF0YSk7XG4gICAgICAvLyBUT0RPOiBmaW5kIGFsbCByZWZlcmVuY2Ugb2YgRGF0YXNldC5zdGF0cy5zYW1wbGUgYW5kIHJlcGxhY2VcbiAgICB9XG5cbiAgICBEYXRhc2V0LmFkZCA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgIGlmICghZGF0YXNldC5pZCkge1xuICAgICAgICBkYXRhc2V0LmlkID0gZGF0YXNldC51cmw7XG4gICAgICB9XG4gICAgICBkYXRhc2V0cy5wdXNoKGRhdGFzZXQpO1xuXG4gICAgICByZXR1cm4gZGF0YXNldDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERhdGFzZXQ7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmRhdGFzZXRNb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGRhdGFzZXRNb2RhbFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRNb2RhbCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZTogZmFsc2VcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdkYXRhc2V0U2VsZWN0b3InLCBmdW5jdGlvbihNb2RhbHMsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge30sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZS8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfT1BFTik7XG4gICAgICAgICAgTW9kYWxzLm9wZW4oJ2RhdGFzZXQtbW9kYWwnKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWxlRHJvcHpvbmVcbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWxlRHJvcHpvbmVcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAvLyBBZGQgdGhlIGZpbGUgcmVhZGVyIGFzIGEgbmFtZWQgZGVwZW5kZW5jeVxuICAuY29uc3RhbnQoJ0ZpbGVSZWFkZXInLCB3aW5kb3cuRmlsZVJlYWRlcilcbiAgLmRpcmVjdGl2ZSgnZmlsZURyb3B6b25lJywgZnVuY3Rpb24gKE1vZGFscywgQWxlcnRzLCBGaWxlUmVhZGVyKSB7XG5cbiAgICAvLyBIZWxwZXIgbWV0aG9kc1xuXG4gICAgZnVuY3Rpb24gaXNTaXplVmFsaWQoc2l6ZSwgbWF4U2l6ZSkge1xuICAgICAgLy8gU2l6ZSBpcyBwcm92aWRlZCBpbiBieXRlczsgbWF4U2l6ZSBpcyBwcm92aWRlZCBpbiBtZWdhYnl0ZXNcbiAgICAgIC8vIENvZXJjZSBtYXhTaXplIHRvIGEgbnVtYmVyIGluIGNhc2UgaXQgY29tZXMgaW4gYXMgYSBzdHJpbmcsXG4gICAgICAvLyAmIHJldHVybiB0cnVlIHdoZW4gbWF4IGZpbGUgc2l6ZSB3YXMgbm90IHNwZWNpZmllZCwgaXMgZW1wdHksXG4gICAgICAvLyBvciBpcyBzdWZmaWNpZW50bHkgbGFyZ2VcbiAgICAgIHJldHVybiAhbWF4U2l6ZSB8fCAoIHNpemUgLyAxMDI0IC8gMTAyNCA8ICttYXhTaXplICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNUeXBlVmFsaWQodHlwZSwgdmFsaWRNaW1lVHlwZXMpIHtcbiAgICAgICAgLy8gSWYgbm8gbWltZSB0eXBlIHJlc3RyaWN0aW9ucyB3ZXJlIHByb3ZpZGVkLCBvciB0aGUgcHJvdmlkZWQgZmlsZSdzXG4gICAgICAgIC8vIHR5cGUgaXMgd2hpdGVsaXN0ZWQsIHR5cGUgaXMgdmFsaWRcbiAgICAgIHJldHVybiAhdmFsaWRNaW1lVHlwZXMgfHwgKCB2YWxpZE1pbWVUeXBlcy5pbmRleE9mKHR5cGUpID4gLTEgKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgLy8gUGVybWl0IGFyYml0cmFyeSBjaGlsZCBjb250ZW50XG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgbWF4RmlsZVNpemU6ICdAJyxcbiAgICAgICAgdmFsaWRNaW1lVHlwZXM6ICdAJyxcbiAgICAgICAgLy8gRXhwb3NlIHRoaXMgZGlyZWN0aXZlJ3MgZGF0YXNldCBwcm9wZXJ0eSB0byBwYXJlbnQgc2NvcGVzIHRocm91Z2hcbiAgICAgICAgLy8gdHdvLXdheSBkYXRhYmluZGluZ1xuICAgICAgICBkYXRhc2V0OiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQvKiwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0gc2NvcGUuZGF0YXNldCB8fCB7fTtcblxuICAgICAgICBlbGVtZW50Lm9uKCdkcmFnb3ZlciBkcmFnZW50ZXInLCBmdW5jdGlvbiBvbkRyYWdFbnRlcihldmVudCkge1xuICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdjb3B5JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZEZpbGUoZmlsZSkge1xuICAgICAgICAgIGlmICghaXNUeXBlVmFsaWQoZmlsZS50eXBlLCBzY29wZS52YWxpZE1pbWVUeXBlcykpIHtcbiAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgQWxlcnRzLmFkZCgnSW52YWxpZCBmaWxlIHR5cGUuIEZpbGUgbXVzdCBiZSBvbmUgb2YgZm9sbG93aW5nIHR5cGVzOiAnICsgc2NvcGUudmFsaWRNaW1lVHlwZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaXNTaXplVmFsaWQoZmlsZS5zaXplLCBzY29wZS5tYXhGaWxlU2l6ZSkpIHtcbiAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgQWxlcnRzLmFkZCgnRmlsZSBtdXN0IGJlIHNtYWxsZXIgdGhhbiAnICsgc2NvcGUubWF4RmlsZVNpemUgKyAnIE1CJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmRhdGFzZXQuZGF0YSA9IGV2dC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgICAvLyBTdHJpcCBmaWxlIG5hbWUgZXh0ZW5zaW9ucyBmcm9tIHRoZSB1cGxvYWRlZCBkYXRhXG4gICAgICAgICAgICAgIHNjb3BlLmRhdGFzZXQubmFtZSA9IGZpbGUubmFtZS5yZXBsYWNlKC9cXC5cXHcrJC8sICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgQWxlcnRzLmFkZCgnRXJyb3IgcmVhZGluZyBmaWxlJyk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudC5vbignZHJvcCcsIGZ1bmN0aW9uIG9uRHJvcChldmVudCkge1xuICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZWFkRmlsZShldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5maWxlc1swXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGVsZW1lbnQuZmluZCgnaW5wdXRbdHlwZT1cImZpbGVcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24gb25VcGxvYWQoLypldmVudCovKSB7XG4gICAgICAgICAgLy8gXCJ0aGlzXCIgaXMgdGhlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICByZWFkRmlsZSh0aGlzLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpwYXN0ZURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBwYXN0ZURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdwYXN0ZURhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyLCBDb25maWcsIF8sIHZnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9wYXN0ZWRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2NvcGUgdmFyaWFibGVzXG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSB7XG4gICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgZGF0YTogJydcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSB2Zy51dGlsLnJlYWQoc2NvcGUuZGF0YXNldC5kYXRhLCB7XG4gICAgICAgICAgICB0eXBlOiAnY3N2J1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHBhc3RlZERhdGFzZXQgPSB7XG4gICAgICAgICAgICBpZDogRGF0ZS5ub3coKSwgIC8vIHRpbWUgYXMgaWRcbiAgICAgICAgICAgIG5hbWU6IHNjb3BlLmRhdGFzZXQubmFtZSxcbiAgICAgICAgICAgIHZhbHVlczogZGF0YSxcbiAgICAgICAgICAgIGdyb3VwOiAncGFzdGVkJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBMb2cgdGhhdCB3ZSBoYXZlIHBhc3RlZCBkYXRhXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1BBU1RFLCBwYXN0ZWREYXRhc2V0Lm5hbWUpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIHBhc3RlZCBkYXRhIGFzIGEgbmV3IGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChwYXN0ZWREYXRhc2V0KTtcblxuICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQ2xvc2UgdGhpcyBkaXJlY3RpdmUncyBjb250YWluaW5nIG1vZGFsXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpLmNvbnN0YW50KCdTYW1wbGVEYXRhJywgW3tcbiAgbmFtZTogJ0JhcmxleScsXG4gIGRlc2NyaXB0aW9uOiAnQmFybGV5IHlpZWxkIGJ5IHZhcmlldHkgYWNyb3NzIHRoZSB1cHBlciBtaWR3ZXN0IGluIDE5MzEgYW5kIDE5MzInLFxuICB1cmw6ICdkYXRhL2JhcmxleS5qc29uJyxcbiAgaWQ6ICdiYXJsZXknLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FycycsXG4gIGRlc2NyaXB0aW9uOiAnQXV0b21vdGl2ZSBzdGF0aXN0aWNzIGZvciBhIHZhcmlldHkgb2YgY2FyIG1vZGVscyBiZXR3ZWVuIDE5NzAgJiAxOTgyJyxcbiAgdXJsOiAnZGF0YS9jYXJzLmpzb24nLFxuICBpZDogJ2NhcnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ3JpbWVhJyxcbiAgdXJsOiAnZGF0YS9jcmltZWEuanNvbicsXG4gIGlkOiAnY3JpbWVhJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0RyaXZpbmcnLFxuICB1cmw6ICdkYXRhL2RyaXZpbmcuanNvbicsXG4gIGlkOiAnZHJpdmluZycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdJcmlzJyxcbiAgdXJsOiAnZGF0YS9pcmlzLmpzb24nLFxuICBpZDogJ2lyaXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSm9icycsXG4gIHVybDogJ2RhdGEvam9icy5qc29uJyxcbiAgaWQ6ICdqb2JzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ1BvcHVsYXRpb24nLFxuICB1cmw6ICdkYXRhL3BvcHVsYXRpb24uanNvbicsXG4gIGlkOiAncG9wdWxhdGlvbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdNb3ZpZXMnLFxuICB1cmw6ICdkYXRhL21vdmllcy5qc29uJyxcbiAgaWQ6ICdtb3ZpZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQmlyZHN0cmlrZXMnLFxuICB1cmw6ICdkYXRhL2JpcmRzdHJpa2VzLmpzb24nLFxuICBpZDogJ2JpcmRzdHJpa2VzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0J1cnRpbicsXG4gIHVybDogJ2RhdGEvYnVydGluLmpzb24nLFxuICBpZDogJ2J1cnRpbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYW1wYWlnbnMnLFxuICB1cmw6ICdkYXRhL3dlYmFsbDI2Lmpzb24nLFxuICBpZDogJ3dlYmFsbDI2JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWxlcnRNZXNzYWdlcycsIGZ1bmN0aW9uKEFsZXJ0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLkFsZXJ0cyA9IEFsZXJ0cztcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpib29rbWFya0xpc3RcbiAqIEBkZXNjcmlwdGlvblxuICogIyBib29rbWFya0xpc3RcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdib29rbWFya0xpc3QnLCBmdW5jdGlvbiAoQm9va21hcmtzLCBjb25zdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPScsIC8vIFRoaXMgb25lIGlzIHJlYWxseSB0d28td2F5IGJpbmRpbmcuXG4gICAgICAgIHBvc3RTZWxlY3RBY3Rpb246ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NoYW5uZWxTaGVsZicsIGZ1bmN0aW9uKEFOWSwgRGF0YXNldCwgUGlsbHMsIF8sIERyb3AsIExvZ2dlciwgdmwsIGNxbCwgU2NoZW1hLCBjb25zdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYW5uZWxJZDogJzwnLFxuICAgICAgICBlbmNvZGluZzogJz0nLFxuICAgICAgICBtYXJrOiAnPCcsXG4gICAgICAgIHByZXZpZXc6ICc8JyxcbiAgICAgICAgZGlzYWJsZWQ6ICc8JyxcbiAgICAgICAgc3VwcG9ydEFueTogJzwnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50IC8qLCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBTY2hlbWEuZ2V0Q2hhbm5lbFNjaGVtYShzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICBzY29wZS5waWxscyA9IFBpbGxzLnBpbGxzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG5cbiAgICAgICAgc2NvcGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uIChjaGFubmVsSWQpIHtcbiAgICAgICAgICB2YXIgaGlnaGxpZ2h0ZWQgPSBQaWxscy5oaWdobGlnaHRlZCB8fCB7fTtcbiAgICAgICAgICByZXR1cm4gaGlnaGxpZ2h0ZWRbc2NvcGUuZW5jb2RpbmdbY2hhbm5lbElkXS5maWVsZF0gfHxcbiAgICAgICAgICAgIGhpZ2hsaWdodGVkWydmJyArIGNoYW5uZWxJZF07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBnZXQgdXBkYXRlZCBpbiB0aGUgd2F0Y2hlclxuICAgICAgICBzY29wZS5pc0FueUNoYW5uZWwgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuaXNBbnlGaWVsZCA9IGZhbHNlO1xuICAgICAgICBzY29wZS5pc0FueUZ1bmN0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgc2NvcGUuc3VwcG9ydE1hcmsgPSBmdW5jdGlvbihjaGFubmVsSWQsIG1hcmspIHtcbiAgICAgICAgICBpZiAoUGlsbHMuaXNBbnlDaGFubmVsKGNoYW5uZWxJZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobWFyayA9PT0gQU5ZKSB7IC8vIFRPRE86IHN1cHBvcnQge2VudW06IFsuLi5dfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2bC5jaGFubmVsLnN1cHBvcnRNYXJrKGNoYW5uZWxJZCwgbWFyayk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHByb3BzUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgY29udGVudDogZWxlbWVudC5maW5kKCcuc2hlbGYtcHJvcGVydGllcycpWzBdLFxuICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcuc2hlbGYtbGFiZWwnKVswXSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSBsZWZ0JyxcbiAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuZmllbGRJbmZvUG9wdXBDb250ZW50ID0gIGVsZW1lbnQuZmluZCgnLnNoZWxmLWZ1bmN0aW9ucycpWzBdO1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZUZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMucmVtb3ZlKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJRUxEX1JFTU9WRUQsIHNjb3BlLmNoYW5uZWxJZCwge2ZpZWxkRGVmOiBzY29wZS5lbmNvZGluZ1tzY29wZS5jaGFubmVsSWRdfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBQaWxscy5kcmFnU3RhcnQoUGlsbHMuZ2V0KHNjb3BlLmNoYW5uZWxJZCksIHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIFBpbGxzLmRyYWdTdG9wKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIGRyb3BwaW5nIHBpbGwuXG4gICAgICAgICAqL1xuICAgICAgICBzY29wZS5maWVsZERyb3BwZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcGlsbCA9IFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgIC8vIHZhbGlkYXRlIHR5cGVcbiAgICAgICAgICB2YXIgdHlwZXMgPSBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zLlR5cGUuZW51bTtcbiAgICAgICAgICBpZiAoIV8uaW5jbHVkZXModHlwZXMsIHBpbGwudHlwZSkgJiYgIWNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwudHlwZSkpIHtcbiAgICAgICAgICAgIC8vIGlmIGV4aXN0aW5nIHR5cGUgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgICAgICAgcGlsbC50eXBlID0gdHlwZXNbMF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSB0aW1lVW5pdCAvIGFnZ3JlZ2F0ZVxuXG4gICAgICAgICAgUGlsbHMuZHJhZ0Ryb3Aoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERfRFJPUCwgcGlsbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGNoYW5uZWxJZFdhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ2NoYW5uZWxJZCcsIGZ1bmN0aW9uKGNoYW5uZWxJZCkge1xuICAgICAgICAgIHNjb3BlLmlzQW55Q2hhbm5lbCA9IFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAvLyBGSVhNRTogcmVtb3ZlIHRoaXMgY29uZnVzaW5nIDItd2F5IGJpbmRpbmcgbG9naWNzXG4gICAgICAgIC8vIElmIHNvbWUgZXh0ZXJuYWwgYWN0aW9uIGNoYW5nZXMgdGhlIGZpZWxkRGVmLCB3ZSBhbHNvIG5lZWQgdG8gdXBkYXRlIHRoZSBwaWxsXG4gICAgICAgIHZhciBjaGFubmVsRW5jb2RpbmdXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdlbmNvZGluZ1tjaGFubmVsSWRdJywgZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICBzY29wZS5oYXNGdW5jdGlvbnMgPSBmaWVsZERlZi5hZ2dyZWdhdGUgPT09ICdjb3VudCcgPyBmYWxzZSA6XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIHZsLnV0aWwuY29udGFpbnMoWydxdWFudGl0YXRpdmUnLCAndGVtcG9yYWwnXSwgZmllbGREZWYudHlwZSkgfHxcbiAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIGZpZWxkRGVmLnR5cGUgJiYgZmllbGREZWYudHlwZS5lbnVtICYmXG4gICAgICAgICAgICAgICAgKHZsLnV0aWwuY29udGFpbnMoZmllbGREZWYudHlwZS5lbnVtLCAncXVhbnRpdGF0aXZlJykgfHwgdmwudXRpbC5jb250YWlucyhmaWVsZERlZi50eXBlLmVudW0sICd0ZW1wb3JhbCcpKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgLy8gUHJldmlldyBzaGVsZiBzaG91bGQgbm90IGNhdXNlIHNpZGUgZWZmZWN0XG4gICAgICAgICAgaWYgKHNjb3BlLnByZXZpZXcpIHtcbiAgICAgICAgICAgIHNjb3BlLmlzRW51bWVyYXRlZEZpZWxkID0gUGlsbHMuaXNFbnVtZXJhdGVkRmllbGQoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICAgIHNjb3BlLmlzRW51bWVyYXRlZENoYW5uZWwgPSBQaWxscy5pc0VudW1lcmF0ZWRDaGFubmVsKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFBpbGxzLnNldChzY29wZS5jaGFubmVsSWQsIGZpZWxkRGVmID8gXy5jbG9uZURlZXAoZmllbGREZWYpIDoge30pO1xuICAgICAgICAgICAgc2NvcGUuaXNBbnlGaWVsZCA9IGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKTtcbiAgICAgICAgICAgIHNjb3BlLmlzQW55RnVuY3Rpb24gPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZERlZi5hZ2dyZWdhdGUpIHx8XG4gICAgICAgICAgICAgIGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkRGVmLmJpbikgfHxcbiAgICAgICAgICAgICAgY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYudGltZVVuaXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHByb3BzUG9wdXAgJiYgcHJvcHNQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICBwcm9wc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyc1xuICAgICAgICAgIGNoYW5uZWxJZFdhdGNoZXIoKTtcbiAgICAgICAgICBjaGFubmVsRW5jb2RpbmdXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2ZpZWxkSW5mbycsIGZ1bmN0aW9uIChBTlksIERyb3AsIHZsLCBjcWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpZWxkRGVmOiAnPCcsXG4gICAgICAgIGZpbHRlckFjdGlvbjogJyYnLFxuICAgICAgICBzaG93QWRkOiAnPCcsXG4gICAgICAgIHNob3dDYXJldDogJzwnLFxuICAgICAgICBzaG93RmlsdGVyOiAnPScsXG4gICAgICAgIHNob3dSZW1vdmU6ICc8JyxcbiAgICAgICAgc2hvd1R5cGU6ICc8JyxcbiAgICAgICAgc2hvd0VudW1TcGVjRm46ICc8JyxcbiAgICAgICAgcG9wdXBDb250ZW50OiAnPCcsXG4gICAgICAgIGFjdGlvbjogJyYnLFxuICAgICAgICBhZGRBY3Rpb246ICcmJyxcbiAgICAgICAgcmVtb3ZlQWN0aW9uOiAnJicsXG4gICAgICAgIGRpc2FibGVDYXJldDogJzwnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZ1bmNzUG9wdXA7XG4gICAgICAgIHNjb3BlLnZsVHlwZSA9IHZsLnR5cGU7XG5cbiAgICAgICAgLy8gUHJvcGVydGllcyB0aGF0IGFyZSBjcmVhdGVkIGJ5IGEgd2F0Y2hlciBsYXRlclxuICAgICAgICBzY29wZS50eXBlTmFtZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLmljb24gPSBudWxsO1xuICAgICAgICBzY29wZS5udWxsID0gbnVsbDtcblxuICAgICAgICBzY29wZS5maWVsZFRpdGxlID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICBpZiAoY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGQpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGZpZWxkLmVudW0gfHwgWydXaWxkY2FyZCddKVxuICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkID09PSAnKicgPyAnQ09VTlQnIDogZmllbGQ7XG4gICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZpZWxkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkQ291bnQgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5lbnVtID8gJyAoJyArIGZpZWxkLmVudW0ubGVuZ3RoICsgJyknIDogJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5jbGlja2VkID0gZnVuY3Rpb24oJGV2ZW50KXtcbiAgICAgICAgICBpZihzY29wZS5hY3Rpb24gJiYgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCcuZmEtY2FyZXQtZG93bicpWzBdICYmXG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJ3NwYW4udHlwZScpWzBdKSB7XG4gICAgICAgICAgICBzY29wZS5hY3Rpb24oJGV2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGlzRW51bVNwZWMgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYztcblxuICAgICAgICBzY29wZS5mdW5jID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlKSB7XG4gICAgICAgICAgICBpZiAoIWlzRW51bVNwZWMoZmllbGREZWYuYWdncmVnYXRlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmllbGREZWYuYWdncmVnYXRlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzY29wZS5zaG93RW51bVNwZWNGbikge1xuICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmllbGREZWYudGltZVVuaXQpIHtcbiAgICAgICAgICAgIGlmICghaXNFbnVtU3BlYyhmaWVsZERlZi50aW1lVW5pdCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLnRpbWVVbml0O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzY29wZS5zaG93RW51bVNwZWNGbikge1xuICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmllbGREZWYuYmluKSB7XG4gICAgICAgICAgICBpZiAoIWlzRW51bVNwZWMoZmllbGREZWYuYmluKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2Jpbic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnNob3dFbnVtU3BlY0ZuKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLl9hZ2dyZWdhdGUgfHwgZmllbGREZWYuX3RpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuX2JpbiAmJiAnYmluJykgfHwgKGZpZWxkRGVmLl9hbnkgJiYgJ2F1dG8nKSB8fCAnJztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcG9wdXBDb250ZW50V2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgncG9wdXBDb250ZW50JywgZnVuY3Rpb24ocG9wdXBDb250ZW50KSB7XG4gICAgICAgICAgaWYgKCFwb3B1cENvbnRlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3NQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IHBvcHVwQ29udGVudCxcbiAgICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcudHlwZS1jYXJldCcpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIFRZUEVfTkFNRVMgPSB7XG4gICAgICAgICAgbm9taW5hbDogJ3RleHQnLFxuICAgICAgICAgIG9yZGluYWw6ICd0ZXh0LW9yZGluYWwnLFxuICAgICAgICAgIHF1YW50aXRhdGl2ZTogJ251bWJlcicsXG4gICAgICAgICAgdGVtcG9yYWw6ICd0aW1lJyxcbiAgICAgICAgICBnZW9ncmFwaGljOiAnZ2VvJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBUWVBFX0lDT05TID0ge1xuICAgICAgICAgIG5vbWluYWw6ICdmYS1mb250JyxcbiAgICAgICAgICBvcmRpbmFsOiAnZmEtZm9udCcsXG4gICAgICAgICAgcXVhbnRpdGF0aXZlOiAnaWNvbi1oYXNoJyxcbiAgICAgICAgICB0ZW1wb3JhbDogJ2ZhLWNhbGVuZGFyJyxcbiAgICAgICAgfTtcbiAgICAgICAgVFlQRV9JQ09OU1tBTlldID0gJ2ZhLWFzdGVyaXNrJzsgLy8gc2VwYXJhdGUgbGluZSBiZWNhdXNlIHdlIG1pZ2h0IGNoYW5nZSB3aGF0J3MgdGhlIHN0cmluZyBmb3IgQU5ZXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VHlwZURpY3RWYWx1ZSh0eXBlLCBkaWN0KSB7XG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHR5cGUpKSB7IC8vIGlzIGVudW1TcGVjXG4gICAgICAgICAgICBpZiAoIXR5cGUuZW51bSkge1xuICAgICAgICAgICAgICByZXR1cm4gQU5ZOyAvLyBlbnVtIHNwZWMgd2l0aG91dCBzcGVjaWZpYyB2YWx1ZXNcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhbCA9IG51bGw7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUuZW51bS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICB2YXIgX3R5cGUgPSB0eXBlLmVudW1baV07XG4gICAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBkaWN0W190eXBlXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsICE9PSBkaWN0W190eXBlXSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIEFOWTsgLy8gSWYgdGhlcmUgYXJlIG1hbnkgY29uZmxpY3RpbmcgdHlwZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkaWN0W3R5cGVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZpZWxkRGVmV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnZmllbGREZWYudHlwZScsIGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICBzY29wZS5pY29uID0gZ2V0VHlwZURpY3RWYWx1ZSh0eXBlLCBUWVBFX0lDT05TKTtcbiAgICAgICAgICBzY29wZS50eXBlTmFtZSA9IGdldFR5cGVEaWN0VmFsdWUodHlwZSwgVFlQRV9OQU1FUyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCAmJiBmdW5jc1BvcHVwLmRlc3Ryb3kpIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHVucmVnaXN0ZXIgd2F0Y2hlcnNcbiAgICAgICAgICBwb3B1cENvbnRlbnRXYXRjaGVyKCk7XG4gICAgICAgICAgZmllbGREZWZXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NhdGVnb3JpY2FsRmlsdGVyJywgZnVuY3Rpb24gKERhdGFzZXQsIHV0aWwsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZmlsdGVyL2NhdGVnb3JpY2FsZmlsdGVyLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZDogJz0nLFxuICAgICAgICBmaWx0ZXI6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLnZhbHVlcyA9IFtdO1xuICAgICAgICBzY29wZS5pbmNsdWRlID0ge307XG5cbiAgICAgICAgc2NvcGUuc2VsZWN0QWxsID0gc2VsZWN0QWxsO1xuICAgICAgICBzY29wZS5zZWxlY3ROb25lID0gc2VsZWN0Tm9uZTtcblxuICAgICAgICBzY29wZS5maWx0ZXJDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklMVEVSX0NIQU5HRSwgc2NvcGUuZmllbGQsIHNjb3BlLmZpbHRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gc2VsZWN0QWxsKCkge1xuICAgICAgICAgIHNldEluY2x1ZGUoc2NvcGUudmFsdWVzKTtcbiAgICAgICAgICBzY29wZS5maWx0ZXJDaGFuZ2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNlbGVjdE5vbmUoKSB7XG4gICAgICAgICAgc2V0SW5jbHVkZShbXSk7XG4gICAgICAgICAgc2NvcGUuZmlsdGVyQ2hhbmdlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRJbmNsdWRlKGxpc3QpIHtcbiAgICAgICAgICBzY29wZS5pbmNsdWRlID0gXy5yZWR1Y2UobGlzdCwgZnVuY3Rpb24oaW5jbHVkZSwgeCkge1xuICAgICAgICAgICAgaW5jbHVkZVt4XSA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gaW5jbHVkZTtcbiAgICAgICAgICB9LCB7fSk7XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2ZpZWxkJywgZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICBzY29wZS52YWx1ZXMgPSBEYXRhc2V0LnNjaGVtYS5kb21haW4oe2ZpZWxkOiBmaWVsZH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2ZpbHRlcicsIGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgIHNldEluY2x1ZGUoZmlsdGVyLmluKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKCdpbmNsdWRlJywgZnVuY3Rpb24oaW5jbHVkZSkge1xuICAgICAgICAgIHNjb3BlLmZpbHRlci5pbiA9IHV0aWwua2V5cyhpbmNsdWRlKS5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5jbHVkZVt2YWxdO1xuICAgICAgICAgIH0pLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBpZiAoK3ggPT09ICt4KSB7IHJldHVybiAreDsgfVxuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgfSkuc29ydCgpO1xuICAgICAgICB9LCB0cnVlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWVsZEluZm9cbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWVsZEluZm9cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdmaWx0ZXJTaGVsdmVzJywgZnVuY3Rpb24gKEZpbHRlck1hbmFnZXIsIERhdGFzZXQsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZmlsdGVyL2ZpbHRlcnNoZWx2ZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuICAgICAgICBzY29wZS5maWx0ZXJNYW5hZ2VyID0gRmlsdGVyTWFuYWdlcjtcbiAgICAgICAgc2NvcGUuY2xlYXJGaWx0ZXIgPSBjbGVhckZpbHRlcjtcbiAgICAgICAgc2NvcGUucmVtb3ZlRmlsdGVyID0gcmVtb3ZlRmlsdGVyO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNsZWFyRmlsdGVyKCkge1xuICAgICAgICAgIEZpbHRlck1hbmFnZXIucmVzZXQoKTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklMVEVSX0NMRUFSKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUZpbHRlcihmaWVsZCkge1xuICAgICAgICAgIEZpbHRlck1hbmFnZXIudG9nZ2xlKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3F1YW50aXRhdGl2ZUZpbHRlcicsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2ZpbHRlci9xdWFudGl0YXRpdmVmaWx0ZXIuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZDogJz0nLFxuICAgICAgICBmaWx0ZXI6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHZhciBkb21haW4gPSBEYXRhc2V0LnNjaGVtYS5kb21haW4oe2ZpZWxkOiBzY29wZS5maWVsZH0pO1xuICAgICAgICBzY29wZS5kb21haW5NaW4gPSBkb21haW5bMF07XG4gICAgICAgIHNjb3BlLmRvbWFpbk1heCA9IGRvbWFpblsxXTtcblxuICAgICAgICB2YXIgdW53YXRjaFJhbmdlID0gc2NvcGUuJHdhdGNoKCdmaWx0ZXIucmFuZ2UnLCBmdW5jdGlvbihyYW5nZSwgb2xkUmFuZ2UpIHtcbiAgICAgICAgICBpZiAoIW9sZFJhbmdlIHx8ICFyYW5nZSB8fCAocmFuZ2UgPT09IG9sZFJhbmdlKSkgcmV0dXJuOyAvLyBza2lwIGZpcnN0IHRpbWVcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklMVEVSX0NIQU5HRSwgc2NvcGUuZmllbGQsIHNjb3BlLmZpbHRlcik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyXG4gICAgICAgICAgdW53YXRjaFJhbmdlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2Z1bmN0aW9uU2VsZWN0JywgZnVuY3Rpb24oXywgY29uc3RzLCB2bCwgY3FsLCBQaWxscywgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9mdW5jdGlvbnNlbGVjdC9mdW5jdGlvbnNlbGVjdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBjaGFubmVsSWQ6ICc8JyxcbiAgICAgICAgZmllbGREZWY6ICc9JyxcbiAgICAgICAgc3VwcG9ydEFueTogJzwnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICB2YXIgQklOPSdiaW4nLCBDT1VOVD0nY291bnQnLCBtYXhiaW5zO1xuXG4gICAgICAgIHNjb3BlLmZ1bmMgPSB7XG4gICAgICAgICAgc2VsZWN0ZWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICBjaGVja2VkOiB7dW5kZWZpbmVkOiB0cnVlfSxcbiAgICAgICAgICBsaXN0OiB7XG4gICAgICAgICAgICBhYm92ZUZvbGQ6IFtdLFxuICAgICAgICAgICAgYmVsb3dGb2xkOiBbXSAvLyBjb3VsZCBiZSBlbXB0eVxuICAgICAgICAgIH0sXG4gICAgICAgICAgaXNBbnk6IGZhbHNlLFxuICAgICAgICAgIGlzVGVtcG9yYWw6IGZhbHNlLCAvLyBmb3IgbWFraW5nIGJlbG93Rm9sZCB0aW1lVW5pdHMgc2luZ2xlLWNvbHVtblxuICAgICAgICAgIGlzQ291bnQ6IGZhbHNlIC8vIGhpZGUgXCJtb3JlXCIgJiBcImxlc3NcIiB0b2dnbGUgZm9yIENPVU5UXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gZnVuY3Rpb25zIGZvciBUID0gdGltZVVuaXRzICsgdW5kZWZpbmVkXG4gICAgICAgIHZhciB0ZW1wb3JhbEZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICBhYm92ZUZvbGQ6IFtcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgJ3llYXInLFxuICAgICAgICAgICAgJ3F1YXJ0ZXInLCAnbW9udGgnLFxuICAgICAgICAgICAgJ2RhdGUnLCdkYXknLFxuICAgICAgICAgICAgJ2hvdXJzJywgJ21pbnV0ZXMnLFxuICAgICAgICAgICAgJ3NlY29uZHMnLCAnbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICd5ZWFybW9udGhkYXRlJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgYmVsb3dGb2xkOiBbXG4gICAgICAgICAgICAneWVhcnF1YXJ0ZXInLFxuICAgICAgICAgICAgJ3llYXJtb250aCcsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZWhvdXJzJyxcbiAgICAgICAgICAgICd5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzJyxcbiAgICAgICAgICAgICd5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzc2Vjb25kcycsXG4gICAgICAgICAgICAnaG91cnNtaW51dGVzJyxcbiAgICAgICAgICAgICdob3Vyc21pbnV0ZXNzZWNvbmRzJyxcbiAgICAgICAgICAgICdtaW51dGVzc2Vjb25kcycsXG4gICAgICAgICAgICAnc2Vjb25kc21pbGxpc2Vjb25kcydcbiAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRpbWVVbml0SGFzVmFyaWF0aW9uRmlsdGVyID0gZnVuY3Rpb24odGltZVVuaXQpIHtcblxuICAgICAgICAgIHZhciBwaWxsID0gIFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgIGlmICghcGlsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBmaWVsZCA9IHBpbGwuZmllbGQ7XG4gICAgICAgICAgLy8gQ29udmVydCAnYW55JyBjaGFubmVsIHRvICc/Jy5cbiAgICAgICAgICB2YXIgY2hhbm5lbCA9IFBpbGxzLmlzQW55Q2hhbm5lbChzY29wZS5jaGFubmVsSWQpID8gJz8nIDogc2NvcGUuY2hhbm5lbElkO1xuXG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkKSkge1xuICAgICAgICAgICAgLy8gSWYgZmllbGQgaXMgPywgd2UgY2FuJ3QgcmVhbGx5IGZpbHRlciB0aW1lVW5pdFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuICF0aW1lVW5pdCB8fCAvLyBEb24ndCBmaWx0ZXIgdW5kZWZpbmVkXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGltZVVuaXRzIHRoYXQgZG8gbm90IGhhdmUgdmFyaWF0aW9uIChjYXJkaW5hbGl0eSA8PSAxKS5cbiAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnRpbWVVbml0SGFzVmFyaWF0aW9uKHtmaWVsZDogZmllbGQsIGNoYW5uZWw6IGNoYW5uZWwsIHRpbWVVbml0OiB0aW1lVW5pdH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHRpbWVVbml0cyA9IFQgZnVuY3Rpb25zIC0gdW5kZWZpbmVkXG4gICAgICAgIHZhciB0aW1lVW5pdHMgPSBfLnB1bGwoXy5jb25jYXQodGVtcG9yYWxGdW5jdGlvbnMuYWJvdmVGb2xkLCB0ZW1wb3JhbEZ1bmN0aW9ucy5iZWxvd0ZvbGQpLCB1bmRlZmluZWQpO1xuXG4gICAgICAgIC8vIGZ1bmN0aW9ucyBmb3IgUSA9IGFnZ3JlZ2F0ZXMgKyBCSU4gKyB1bmRlZmluZWQgLSBDT1VOVFxuICAgICAgICB2YXIgcXVhbnRpdGF0aXZlRnVuY3Rpb25zID0ge1xuICAgICAgICAgIGFib3ZlRm9sZDogW1xuICAgICAgICAgICAgdW5kZWZpbmVkLCAnYmluJyxcbiAgICAgICAgICAgICdtaW4nLCAnbWF4JyxcbiAgICAgICAgICAgICdtZWFuJywgJ21lZGlhbicsXG4gICAgICAgICAgICAnc3VtJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgYmVsb3dGb2xkOiBbXG4gICAgICAgICAgICAndmFsaWQnLCAnbWlzc2luZycsXG4gICAgICAgICAgICAnZGlzdGluY3QnLCAnbW9kZXNrZXcnLFxuICAgICAgICAgICAgJ3ExJywgJ3EzJyxcbiAgICAgICAgICAgICdzdGRldicsICdzdGRldnAnLFxuICAgICAgICAgICAgJ3ZhcmlhbmNlJywgJ3ZhcmlhbmNlcCdcbiAgICAgICAgICBdIC8vIGhpZGUgQ09VTlQgZm9yIFEgaW4gdGhlIFVJIGJlY2F1c2Ugd2UgZGVkaWNhdGUgaXQgdG8gYSBzcGVjaWFsIFwiIyBDb3VudFwiIGZpZWxkXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYWdncmVnYXRlcyA9IFEgRnVuY3Rpb25zICsgQ09VTlQgLSBCSU4gLSB1bmRlZmluZWRcbiAgICAgICAgdmFyIGFnZ3JlZ2F0ZXMgPSBfLnB1bGwoXy5jb25jYXQocXVhbnRpdGF0aXZlRnVuY3Rpb25zLmFib3ZlRm9sZCwgcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmJlbG93Rm9sZCwgW0NPVU5UXSksXG4gICAgICAgICAgQklOLCB1bmRlZmluZWQpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzUGlsbFEocGlsbCkge1xuICAgICAgICAgIHJldHVybiBwaWxsICYmIHBpbGwudHlwZSAmJiAocGlsbC50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSB8fCAocGlsbC50eXBlLmVudW0gJiYgdmwudXRpbC5jb250YWlucyhwaWxsLnR5cGUuZW51bSx2bC50eXBlLlFVQU5USVRBVElWRSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzUGlsbFQocGlsbCkge1xuICAgICAgICAgIHJldHVybiBwaWxsICYmIHBpbGwudHlwZSAmJiAocGlsbC50eXBlID09PSB2bC50eXBlLlRFTVBPUkFMIHx8IChwaWxsLnR5cGUuZW51bSAmJiB2bC51dGlsLmNvbnRhaW5zKHBpbGwudHlwZS5lbnVtLHZsLnR5cGUuVEVNUE9SQUwpKSk7XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS5zZWxlY3RDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZVTkNfQ0hBTkdFLCBzY29wZS5mdW5jLnNlbGVjdGVkLCB7XG4gICAgICAgICAgICBjaGFubmVsOiBzY29wZS5jaGFubmVsSWRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBzZWxlY3RlZEZ1bmMgPSBzY29wZS5mdW5jLnNlbGVjdGVkO1xuXG4gICAgICAgICAgdmFyIG9sZFBpbGwgPSBQaWxscy5nZXQoc2NvcGUuY2hhbm5lbElkKSxcbiAgICAgICAgICAgIHBpbGwgPSBfLmNsb25lKG9sZFBpbGwpLFxuICAgICAgICAgICAgaXNRID0gaXNQaWxsUShwaWxsKSxcbiAgICAgICAgICAgIGlzVCA9IGlzUGlsbFQocGlsbCk7XG5cbiAgICAgICAgICBpZighcGlsbCl7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vdCByZWFkeVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHJlc2V0IGZpZWxkIGRlZlxuICAgICAgICAgIC8vIEhBQ0s6IHdlJ3JlIHRlbXBvcmFyaWx5IHN0b3JpbmcgdGhlIG1heGJpbnMgaW4gdGhlIHBpbGxcbiAgICAgICAgICAvLyBGSVhNRSB0ZW1wb3JhbCBjYW4gYWN0dWFsbHkgaGF2ZSBhZ2dyZWdhdGlvbiBpbiBwcmFjdGljZSB0b29cbiAgICAgICAgICBwaWxsLmJpbiA9IHNlbGVjdGVkRnVuYyA9PT0gQklOID8ge30gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgcGlsbC5hZ2dyZWdhdGUgPSAoaXNRICYmIGFnZ3JlZ2F0ZXMuaW5kZXhPZihzZWxlY3RlZEZ1bmMpICE9PSAtMSkgPyBzZWxlY3RlZEZ1bmMgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgcGlsbC50aW1lVW5pdCA9IChpc1QgJiYgdGltZVVuaXRzLmluZGV4T2Yoc2VsZWN0ZWRGdW5jKSAhPT0gLTEpID8gc2VsZWN0ZWRGdW5jIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgaWYoIV8uaXNFcXVhbChvbGRQaWxsLCBwaWxsKSl7XG4gICAgICAgICAgICBQaWxscy5zZXQoc2NvcGUuY2hhbm5lbElkLCBwaWxsLCB0cnVlIC8qIHByb3BhZ2F0ZSBjaGFuZ2UgKi8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5pc0FueUNoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmZ1bmMuaXNBbnkpIHtcbiAgICAgICAgICAgIHZhciBjaGVja2VkID0ge307XG4gICAgICAgICAgICBjaGVja2VkW3Njb3BlLmZ1bmMuc2VsZWN0ZWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMuY2hlY2tlZCA9IGNoZWNrZWQ7XG4gICAgICAgICAgICBzY29wZS5jaGVja0NoYW5nZWQoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NvcGUuc2VsZWN0Q2hhbmdlZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5jaGVja0NoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgb2xkUGlsbCA9IFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLFxuICAgICAgICAgICAgcGlsbCA9IF8uY2xvbmUob2xkUGlsbCksXG4gICAgICAgICAgICBpc1EgPSBpc1BpbGxRKHBpbGwpLFxuICAgICAgICAgICAgaXNUID0gaXNQaWxsVChwaWxsKTtcblxuICAgICAgICAgIGlmICghcGlsbCkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub3QgcmVhZHlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRlVOQ19DSEFOR0UsIHNjb3BlLmZ1bmMuY2hlY2tlZCwge1xuICAgICAgICAgICAgY2hhbm5lbDogc2NvcGUuY2hhbm5lbElkXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgZm5zID0gT2JqZWN0LmtleXMoc2NvcGUuZnVuYy5jaGVja2VkKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihmKSB7IHJldHVybiBmICE9PSAnYmluJzsgfSlcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oZikgeyByZXR1cm4gZiA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBmIH0pO1xuXG4gICAgICAgICAgLy8gRklYTUUgdGVtcG9yYWwgLyBvcmRpbmFsIC8gbm9taW5hbCBjYW4gYWN0dWFsbHkgaGF2ZSBhZ2dyZWdhdGlvbiBpbiBwcmFjdGljZSB0b29cbiAgICAgICAgICBpZiAoaXNRKSB7XG4gICAgICAgICAgICBwaWxsLmJpbiA9IHNjb3BlLmZ1bmMuY2hlY2tlZC5iaW4gP1xuICAgICAgICAgICAgICAoZm5zLmxlbmd0aCA+IDAgPyB7ZW51bTogW2ZhbHNlLCB0cnVlXX0gOiB0cnVlKSA6XG4gICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHBpbGwuYWdncmVnYXRlID0ge2VudW06IHNjb3BlLmZ1bmMuY2hlY2tlZC5iaW4gPyBmbnMuY29uY2F0KFt1bmRlZmluZWRdKSA6IGZuc307XG4gICAgICAgICAgICBwaWxsLmhhc0ZuID0gc2NvcGUuZnVuYy5jaGVja2VkWyd1bmRlZmluZWQnXSA/IHVuZGVmaW5lZCA6IHRydWU7XG5cbiAgICAgICAgICAgIHBpbGwudGltZVVuaXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChpc1QpIHtcbiAgICAgICAgICAgIHBpbGwuYWdncmVnYXRlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcGlsbC5iaW4gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBwaWxsLnRpbWVVbml0ID0ge2VudW06IGZuc307XG4gICAgICAgICAgICBwaWxsLmhhc0ZuID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmKCFfLmlzRXF1YWwob2xkUGlsbCwgcGlsbCkpe1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgcGlsbCwgdHJ1ZSAvKiBwcm9wYWdhdGUgY2hhbmdlICovKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gd2hlbiBwYXJlbnQgb2JqZWN0cyBtb2RpZnkgdGhlIGZpZWxkXG4gICAgICAgIHZhciBmaWVsZERlZldhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ2ZpZWxkRGVmJywgZnVuY3Rpb24ocGlsbCkge1xuICAgICAgICAgIGlmICghcGlsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGhhY2s6IHNhdmUgdGhlIG1heGJpbnNcbiAgICAgICAgICBpZiAocGlsbC5iaW4pIHtcbiAgICAgICAgICAgIG1heGJpbnMgPSBwaWxsLmJpbi5tYXhiaW5zO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBpc09yZGluYWxTaGVsZiA9IFsncm93JywnY29sdW1uJywnc2hhcGUnXS5pbmRleE9mKHNjb3BlLmNoYW5uZWxJZCkgIT09IC0xLFxuICAgICAgICAgICAgICBpc1EgPSBpc1BpbGxRKHBpbGwpLFxuICAgICAgICAgICAgICBpc1QgPSBpc1BpbGxUKHBpbGwpO1xuXG4gICAgICAgICAgLy8gZm9yIG1ha2luZyBiZWxvd0ZvbGQgdGltZVVuaXRzIHNpbmdsZS1jb2x1bW5cbiAgICAgICAgICBzY29wZS5mdW5jLmlzVGVtcG9yYWwgPSBpc1Q7XG5cbiAgICAgICAgICAvLyBoaWRlIFwibW9yZVwiICYgXCJsZXNzXCIgdG9nZ2xlcyBmb3IgQ09VTlRcbiAgICAgICAgICBzY29wZS5mdW5jLmlzQ291bnQgPSBwaWxsLmZpZWxkID09PSAnKic7XG5cbiAgICAgICAgICBpZihwaWxsLmZpZWxkID09PSAnKicgJiYgcGlsbC5hZ2dyZWdhdGUgPT09IENPVU5UKXtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQ9W0NPVU5UXTtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5iZWxvd0ZvbGQ9W107XG4gICAgICAgICAgICBzY29wZS5mdW5jLnNlbGVjdGVkID0gQ09VTlQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHN1cHBvcnRlZCB0eXBlIGJhc2VkIG9uIHByaW1pdGl2ZSBkYXRhP1xuICAgICAgICAgICAgaWYgKGlzVCkge1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkID0gdGVtcG9yYWxGdW5jdGlvbnMuYWJvdmVGb2xkLmZpbHRlcih0aW1lVW5pdEhhc1ZhcmlhdGlvbkZpbHRlcik7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5iZWxvd0ZvbGQgPSB0ZW1wb3JhbEZ1bmN0aW9ucy5iZWxvd0ZvbGQuZmlsdGVyKHRpbWVVbml0SGFzVmFyaWF0aW9uRmlsdGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzUSkge1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkID0gcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmFib3ZlRm9sZDtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZCA9IHF1YW50aXRhdGl2ZUZ1bmN0aW9ucy5iZWxvd0ZvbGQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBkZWZhdWx0VmFsID0gKGlzT3JkaW5hbFNoZWxmICYmXG4gICAgICAgICAgICAgIChpc1EgJiYgQklOKSB8fCAoaXNUICYmIGNvbnN0cy5kZWZhdWx0VGltZUZuKVxuICAgICAgICAgICAgKSB8fCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIHNjb3BlLmZ1bmMuaXNBbnkgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLmFnZ3JlZ2F0ZSkgfHxcbiAgICAgICAgICAgICAgY3FsLmVudW1TcGVjLmlzRW51bVNwZWMocGlsbC5iaW4pIHx8XG4gICAgICAgICAgICAgIGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwudGltZVVuaXQpO1xuXG4gICAgICAgICAgICBpZiAoc2NvcGUuZnVuYy5pc0FueSkge1xuICAgICAgICAgICAgICB2YXIgY2hlY2tlZCA9IHt9O1xuICAgICAgICAgICAgICBpZiAoaXNRKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc2FsbG93VW5kZWZpbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKHBpbGwuYmluKSB7XG4gICAgICAgICAgICAgICAgICBjaGVja2VkLmJpbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBpZiAoY3FsLmVudW1TcGVjLmlzRW51bVNwZWMocGlsbC5iaW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwaWxsLmJpbi5lbnVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcGlsbC5iaW4uZW51bS5mb3JFYWNoKGZ1bmN0aW9uKGJpbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFiaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWxsb3dVbmRlZmluZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkaXNhbGxvd1VuZGVmaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChwaWxsLmFnZ3JlZ2F0ZSkge1xuICAgICAgICAgICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwuYWdncmVnYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYWdncmVnYXRlcyA9IHBpbGwuYWdncmVnYXRlLmVudW0gfHwgY3FsLmNvbmZpZy5ERUZBVUxUX1FVRVJZX0NPTkZJRy5hZ2dyZWdhdGVzO1xuICAgICAgICAgICAgICAgICAgICBhZ2dyZWdhdGVzLmZvckVhY2goZnVuY3Rpb24oYWdncmVnYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hlY2tlZFthZ2dyZWdhdGVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tlZFsndW5kZWZpbmVkJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICBkaXNhbGxvd1VuZGVmaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWRbcGlsbC5hZ2dyZWdhdGVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlzYWxsb3dVbmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjaGVja2VkWyd1bmRlZmluZWQnXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgY2hlY2tlZFsndW5kZWZpbmVkJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1QpIHtcbiAgICAgICAgICAgICAgICBpZiAocGlsbC50aW1lVW5pdCkge1xuICAgICAgICAgICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwudGltZVVuaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lVW5pdHMgPSBwaWxsLnRpbWVVbml0LmVudW0gfHwgY3FsLmNvbmZpZy5ERUZBVUxUX1FVRVJZX0NPTkZJRy5hZ2dyZWdhdGVzO1xuICAgICAgICAgICAgICAgICAgICB0aW1lVW5pdHMuZm9yRWFjaChmdW5jdGlvbih0aW1lVW5pdCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNoZWNrZWRbdGltZVVuaXRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBOb24tZW51bSBzcGVjXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZWRbcGlsbC50aW1lVW5pdF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBjaGVja2VkWyd1bmRlZmluZWQnXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMuY2hlY2tlZCA9IGNoZWNrZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSBwaWxsLmJpbiA/ICdiaW4nIDpcbiAgICAgICAgICAgICAgICBwaWxsLmFnZ3JlZ2F0ZSB8fCBwaWxsLnRpbWVVbml0O1xuXG4gICAgICAgICAgICAgIGlmIChzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkLmluZGV4T2Yoc2VsZWN0ZWQpID49IDAgfHwgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZC5pbmRleE9mKHNlbGVjdGVkKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuZnVuYy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjb3BlLmZ1bmMuc2VsZWN0ZWQgPSBkZWZhdWx0VmFsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlcihzKVxuICAgICAgICAgIGZpZWxkRGVmV2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWwnLCBmdW5jdGlvbiAoJGRvY3VtZW50LCBNb2RhbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL21vZGFsL21vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBhdXRvT3BlbjogJzwnLFxuICAgICAgICBtYXhXaWR0aDogJ0AnXG4gICAgICB9LFxuICAgICAgLy8gUHJvdmlkZSBhbiBpbnRlcmZhY2UgZm9yIGNoaWxkIGRpcmVjdGl2ZXMgdG8gY2xvc2UgdGhpcyBtb2RhbFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIHZhciBtb2RhbElkID0gYXR0cnMuaWQ7XG5cbiAgICAgICAgaWYgKHNjb3BlLm1heFdpZHRoKSB7XG4gICAgICAgICAgc2NvcGUud3JhcHBlclN0eWxlID0gJ21heC13aWR0aDonICsgc2NvcGUubWF4V2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGNsb3NlZCB1bmxlc3MgYXV0b09wZW4gaXMgc2V0XG4gICAgICAgIHNjb3BlLmlzT3BlbiA9IHNjb3BlLmF1dG9PcGVuO1xuXG4gICAgICAgIC8vIGNsb3NlIG9uIGVzY1xuICAgICAgICBmdW5jdGlvbiBlc2NhcGUoZSkge1xuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDI3ICYmIHNjb3BlLmlzT3Blbikge1xuICAgICAgICAgICAgc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCRkb2N1bWVudCkub24oJ2tleWRvd24nLCBlc2NhcGUpO1xuXG4gICAgICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kYWwgd2l0aCB0aGUgc2VydmljZVxuICAgICAgICBNb2RhbHMucmVnaXN0ZXIobW9kYWxJZCwgc2NvcGUpO1xuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTW9kYWxzLmRlcmVnaXN0ZXIobW9kYWxJZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsQ2xvc2VCdXR0b25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbENsb3NlQnV0dG9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWxDbG9zZUJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl5tb2RhbCcsXG4gICAgICBzY29wZToge1xuICAgICAgICBjbG9zZUFjdGlvbjogJyYnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgc2NvcGUuY2xvc2VNb2RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIGlmIChzY29wZS5jbG9zZUFjdGlvbikge1xuICAgICAgICAgICAgc2NvcGUuY2xvc2VBY3Rpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuTW9kYWxzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgTW9kYWxzXG4gKiBTZXJ2aWNlIHVzZWQgdG8gY29udHJvbCBtb2RhbCB2aXNpYmlsaXR5IGZyb20gYW55d2hlcmUgaW4gdGhlIGFwcGxpY2F0aW9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ01vZGFscycsIGZ1bmN0aW9uICgkY2FjaGVGYWN0b3J5KSB7XG5cbiAgICAvLyBUT0RPOiBUaGUgdXNlIG9mIHNjb3BlIGhlcmUgYXMgdGhlIG1ldGhvZCBieSB3aGljaCBhIG1vZGFsIGRpcmVjdGl2ZVxuICAgIC8vIGlzIHJlZ2lzdGVyZWQgYW5kIGNvbnRyb2xsZWQgbWF5IG5lZWQgdG8gY2hhbmdlIHRvIHN1cHBvcnQgcmV0cmlldmluZ1xuICAgIC8vIGRhdGEgZnJvbSBhIG1vZGFsIGFzIG1heSBiZSBuZWVkZWQgaW4gIzc3XG4gICAgdmFyIG1vZGFsc0NhY2hlID0gJGNhY2hlRmFjdG9yeSgnbW9kYWxzJyk7XG5cbiAgICAvLyBQdWJsaWMgQVBJXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihpZCwgc2NvcGUpIHtcbiAgICAgICAgaWYgKG1vZGFsc0NhY2hlLmdldChpZCkpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdDYW5ub3QgcmVnaXN0ZXIgdHdvIG1vZGFscyB3aXRoIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsc0NhY2hlLnB1dChpZCwgc2NvcGUpO1xuICAgICAgfSxcblxuICAgICAgZGVyZWdpc3RlcjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlKGlkKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIE9wZW4gYSBtb2RhbFxuICAgICAgb3BlbjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSB0cnVlO1xuICAgICAgfSxcblxuICAgICAgLy8gQ2xvc2UgYSBtb2RhbFxuICAgICAgY2xvc2U6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBtb2RhbFNjb3BlID0gbW9kYWxzQ2FjaGUuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFtb2RhbFNjb3BlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5yZWdpc3RlcmVkIG1vZGFsIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsU2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICB9LFxuXG4gICAgICBlbXB0eTogZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGFsc0NhY2hlLnJlbW92ZUFsbCgpO1xuICAgICAgfSxcblxuICAgICAgY291bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kYWxzQ2FjaGUuaW5mbygpLnNpemU7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTpwcm9wZXJ0eUVkaXRvclxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHByb3BlcnR5RWRpdG9yXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgncHJvcGVydHlFZGl0b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9wcm9wZXJ0eWVkaXRvci9wcm9wZXJ0eWVkaXRvci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBpZDogJz0nLFxuICAgICAgICB0eXBlOiAnPScsXG4gICAgICAgIGVudW06ICc9JyxcbiAgICAgICAgcHJvcE5hbWU6ICc9JyxcbiAgICAgICAgZ3JvdXA6ICc9JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICc9JyxcbiAgICAgICAgZGVmYXVsdDogJz0nLFxuICAgICAgICBtaW46ICc9JyxcbiAgICAgICAgbWF4OiAnPScsXG4gICAgICAgIHJvbGU6ICc9JyAvLyBmb3IgZXhhbXBsZSAnY29sb3InXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuaGFzQXV0byA9IHNjb3BlLmRlZmF1bHQgPT09IHVuZGVmaW5lZDtcblxuICAgICAgICAvL1RPRE8oa2FuaXR3KTogY29uc2lkZXIgcmVuYW1pbmdcbiAgICAgICAgc2NvcGUuYXV0b21vZGVsID0geyB2YWx1ZTogZmFsc2UgfTtcblxuICAgICAgICBpZiAoc2NvcGUuaGFzQXV0bykge1xuICAgICAgICAgIHNjb3BlLmF1dG9tb2RlbC52YWx1ZSA9IHNjb3BlLmdyb3VwW3Njb3BlLnByb3BOYW1lXSA9PT0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgLy8gY2hhbmdlIHRoZSB2YWx1ZSB0byB1bmRlZmluZWQgaWYgYXV0byBpcyB0cnVlXG4gICAgICAgICAgdmFyIGF1dG9Nb2RlbFdhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ2F1dG9tb2RlbC52YWx1ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmF1dG9tb2RlbC52YWx1ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICBzY29wZS5ncm91cFtzY29wZS5wcm9wTmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyXG4gICAgICAgICAgICBhdXRvTW9kZWxXYXRjaGVyKCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLmlzUmFuZ2UgPSBzY29wZS5tYXggIT09IHVuZGVmaW5lZCAmJiBzY29wZS5taW4gIT09IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdzY2hlbWFMaXN0JywgZnVuY3Rpb24odmwsIGNxbCwgTG9nZ2VyLCBQaWxscykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvc2NoZW1hbGlzdC9zY2hlbWFsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG9yZGVyQnk6ICc8JyxcbiAgICAgICAgZmllbGREZWZzOiAnPCcsXG4gICAgICAgIGZpbHRlck1hbmFnZXI6ICc9JyxcbiAgICAgICAgc2hvd0FkZDogJzwnLFxuICAgICAgICBzaG93Q291bnQ6ICc8JyxcbiAgICAgICAgc2hvd0Ryb3A6ICc8J1xuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBzY29wZS5QaWxscyA9IFBpbGxzO1xuICAgICAgICBzY29wZS5pc0VudW1TcGVjID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWM7XG5cbiAgICAgICAgc2NvcGUuZHJvcHBlZEZpZWxkRGVmID0ge307XG4gICAgICAgIHNjb3BlLmNvdW50RmllbGREZWYgPSBQaWxscy5jb3VudEZpZWxkRGVmO1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJvcHBlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5BRERfV0lMRENBUkQsIHNjb3BlLmRyb3BwZWRGaWVsZERlZik7XG4gICAgICAgICAgUGlsbHMuYWRkV2lsZGNhcmQoc2NvcGUuZHJvcHBlZEZpZWxkRGVmKTtcbiAgICAgICAgICBzY29wZS5kcm9wcGVkRmllbGREZWYgPSB7fTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBwb2xlc3Rhci5kaXJlY3RpdmU6c2NoZW1hTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyBzY2hlbWFMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NjaGVtYUxpc3RJdGVtJywgZnVuY3Rpb24gKERhdGFzZXQsIERyb3AsIExvZ2dlciwgUGlsbHMsIGNxbCwgdmwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZERlZjogJz0nLCAvLyBUd28td2F5XG4gICAgICAgIHNob3dBZGQ6ICAnPCcsXG4gICAgICAgIGZpbHRlck1hbmFnZXI6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuICAgICAgICBzY29wZS5jb3VudEZpZWxkRGVmID0gUGlsbHMuY291bnRGaWVsZERlZjtcblxuICAgICAgICBzY29wZS5pc0FueUZpZWxkID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmRyb3BwZWRGaWVsZERlZiA9IG51bGw7XG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb1BvcHVwQ29udGVudCA9ICBlbGVtZW50LmZpbmQoJy5zY2hlbWEtbWVudScpWzBdO1xuXG4gICAgICAgIHNjb3BlLmlzRW51bVNwZWMgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYztcblxuICAgICAgICBzY29wZS5maWVsZEFkZCA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgUGlsbHMuYWRkKGZpZWxkRGVmKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmZpbHRlck1hbmFnZXIpIHJldHVybjtcbiAgICAgICAgICBzY29wZS5maWx0ZXJNYW5hZ2VyLnRvZ2dsZShzY29wZS5maWVsZERlZi5maWVsZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzY29wZS5maWVsZERlZjtcblxuICAgICAgICAgIHNjb3BlLnBpbGwgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICB0aXRsZTogZmllbGREZWYudGl0bGUsXG4gICAgICAgICAgICB0eXBlOiBmaWVsZERlZi50eXBlLFxuICAgICAgICAgICAgYWdncmVnYXRlOiBmaWVsZERlZi5hZ2dyZWdhdGVcbiAgICAgICAgICB9O1xuICAgICAgICAgIFBpbGxzLmRyYWdTdGFydChzY29wZS5waWxsLCBudWxsKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZERyYWdTdG9wID0gUGlsbHMuZHJhZ1N0b3A7XG5cbiAgICAgICAgc2NvcGUuZmllbGREcm9wcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMuYWRkV2lsZGNhcmRGaWVsZChzY29wZS5maWVsZERlZiwgc2NvcGUuZHJvcHBlZEZpZWxkRGVmKTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQUREX1dJTERDQVJEX0ZJRUxELCBzY29wZS5maWVsZERlZiwge1xuICAgICAgICAgICAgYWRkZWRGaWVsZDogc2NvcGUuZHJvcHBlZEZpZWxkRGVmXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc2NvcGUuZHJvcHBlZEZpZWxkRGVmID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5yZW1vdmVXaWxkY2FyZEZpZWxkID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICB2YXIgZmllbGQgPSBzY29wZS5maWVsZERlZi5maWVsZDtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuUkVNT1ZFX1dJTERDQVJEX0ZJRUxELCBzY29wZS5maWVsZERlZiwge1xuICAgICAgICAgICAgcmVtb3ZlZEZpZWxkOiBmaWVsZC5lbnVtW2luZGV4XSA9PT0gJyonID8gJ0NPVU5UJyA6IGZpZWxkLmVudW1baW5kZXhdXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgUGlsbHMucmVtb3ZlV2lsZGNhcmRGaWVsZChzY29wZS5maWVsZERlZiwgaW5kZXgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZVdpbGRjYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlJFTU9WRV9XSUxEQ0FSRCwgc2NvcGUuZmllbGREZWYpO1xuICAgICAgICAgIFBpbGxzLnJlbW92ZVdpbGRjYXJkKHNjb3BlLmZpZWxkRGVmKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0RPKGh0dHBzOi8vZ2l0aHViLmNvbS92ZWdhL3ZlZ2EtbGl0ZS11aS9pc3N1ZXMvMTg3KTpcbiAgICAgICAgLy8gY29uc2lkZXIgaWYgd2UgY2FuIHVzZSB2YWxpZGF0b3IgLyBjcWwgaW5zdGVhZFxuICAgICAgICB2YXIgYWxsb3dlZENhc3RpbmcgPSB7XG4gICAgICAgICAgaW50ZWdlcjogW3ZsLnR5cGUuUVVBTlRJVEFUSVZFLCB2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgbnVtYmVyOiBbdmwudHlwZS5RVUFOVElUQVRJVkUsIHZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXSxcbiAgICAgICAgICBkYXRlOiBbdmwuVEVNUE9SQUxdLFxuICAgICAgICAgIHN0cmluZzogW3ZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgYm9vbGVhbjogW3ZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgYWxsOiBbdmwudHlwZS5RVUFOVElUQVRJVkUsIHZsLnR5cGUuVEVNUE9SQUwsIHZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB1bndhdGNoRmllbGREZWYgPSBzY29wZS4kd2F0Y2goJ2ZpZWxkRGVmJywgZnVuY3Rpb24oZmllbGREZWYpe1xuICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZERlZi5maWVsZCkpIHtcbiAgICAgICAgICAgIHNjb3BlLmFsbG93ZWRUeXBlcyA9IGFsbG93ZWRDYXN0aW5nLmFsbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NvcGUuYWxsb3dlZFR5cGVzID0gYWxsb3dlZENhc3RpbmdbZmllbGREZWYucHJpbWl0aXZlVHlwZV07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuaXNBbnlGaWVsZCA9IGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmZpZWxkQWRkID0gbnVsbDtcbiAgICAgICAgICBzY29wZS5maWVsZERyYWdTdG9wID0gbnVsbDtcbiAgICAgICAgICBzY29wZS5pc0VudW1TcGVjID0gbnVsbDtcblxuICAgICAgICAgIHVud2F0Y2hGaWVsZERlZigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdzaGVsdmVzJywgZnVuY3Rpb24oKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBzcGVjOiAnPScsXG4gICAgICAgIHByZXZpZXc6ICc8JyxcbiAgICAgICAgc3VwcG9ydEFueTogJzwnLFxuICAgICAgICBzdXBwb3J0QXV0b01hcms6ICc8JyxcbiAgICAgICAgZmlsdGVyTWFuYWdlcjogJz0nXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgQU5ZLCB1dGlsLCB2bCwgQ29uZmlnLCBEYXRhc2V0LCBMb2dnZXIsIFBpbGxzKSB7XG4gICAgICAgICRzY29wZS5BTlkgPSBBTlk7XG4gICAgICAgICRzY29wZS5hbnlDaGFubmVsSWRzID0gW107XG4gICAgICAgICRzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICAkc2NvcGUubWFya3MgPSBbJ3BvaW50JywgJ3RpY2snLCAnYmFyJywgJ2xpbmUnLCAnYXJlYScsICd0ZXh0J107XG4gICAgICAgICRzY29wZS5tYXJrc1dpdGhBbnkgPSBbQU5ZXS5jb25jYXQoJHNjb3BlLm1hcmtzKTtcblxuICAgICAgICAkc2NvcGUubWFya0NoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5NQVJLX0NIQU5HRSwgJHNjb3BlLnNwZWMubWFyayk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmwuc3BlYy50cmFuc3Bvc2UoJHNjb3BlLnNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNQRUNfQ0xFQU4sICRzY29wZS5zcGVjKTtcbiAgICAgICAgICBQaWxscy5yZXNldCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzcGVjV2F0Y2hlciA9ICRzY29wZS4kd2F0Y2goJ3NwZWMnLCBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgLy8gcG9wdWxhdGUgYW55Q2hhbm5lbElkcyBzbyB3ZSBzaG93IGFsbCBvciB0aGVtXG4gICAgICAgICAgaWYgKCRzY29wZS5zdXBwb3J0QW55KSB7XG4gICAgICAgICAgICAkc2NvcGUuYW55Q2hhbm5lbElkcyA9IHV0aWwua2V5cyhzcGVjLmVuY29kaW5nKS5yZWR1Y2UoZnVuY3Rpb24oYW55Q2hhbm5lbElkcywgY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgIGlmIChQaWxscy5pc0FueUNoYW5uZWwoY2hhbm5lbElkKSkge1xuICAgICAgICAgICAgICAgIGFueUNoYW5uZWxJZHMucHVzaChjaGFubmVsSWQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBhbnlDaGFubmVsSWRzO1xuICAgICAgICAgICAgfSwgW10pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPbmx5IGNhbGwgUGlsbHMudXBkYXRlLCB3aGljaCB3aWxsIHRyaWdnZXIgU3BlYy5zcGVjIHRvIHVwZGF0ZSBpZiBpdCdzIG5vdCBhIHByZXZpZXcuXG4gICAgICAgICAgaWYgKCEkc2NvcGUucHJldmlldykge1xuICAgICAgICAgICAgdmFyIFNwZWMgPSBQaWxscy51cGRhdGUoc3BlYyk7XG4gICAgICAgICAgICB2YXIgbG9nRGF0YSA9IG51bGw7XG4gICAgICAgICAgICBpZiAoU3BlYykge1xuICAgICAgICAgICAgICBpZiAoU3BlYy5jaGFydHMpIHtcbiAgICAgICAgICAgICAgICBsb2dEYXRhID0ge3NwZWNpZmljOiBmYWxzZSwgbnVtQ2hhcnRzOiBTcGVjLmNoYXJ0cy5sZW5ndGh9O1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKFNwZWMuY2hhcnQpIHtcbiAgICAgICAgICAgICAgICBsb2dEYXRhID0ge3NwZWNpZmljOiB0cnVlfTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dEYXRhID0ge3NwZWNpZmljOiBmYWxzZSwgbnVtQ2hhcnRzOiAwfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNQRUNfQ0hBTkdFLCBzcGVjLCBsb2dEYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpOyAvLywgdHJ1ZSAvKiB3YXRjaCBlcXVhbGl0eSByYXRoZXIgdGhhbiByZWZlcmVuY2UgKi8pO1xuXG5cbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyXG4gICAgICAgICAgc3BlY1dhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFiXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFiXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFiJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90YWJzL3RhYi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl50YWJzZXQnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoZWFkaW5nOiAnQCdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIHRhYnNldENvbnRyb2xsZXIpIHtcbiAgICAgICAgdGFic2V0Q29udHJvbGxlci5hZGRUYWIoc2NvcGUpO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYnNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYnNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYnNldCcsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdGFicy90YWJzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcblxuICAgICAgLy8gSW50ZXJmYWNlIGZvciB0YWJzIHRvIHJlZ2lzdGVyIHRoZW1zZWx2ZXNcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50YWJzID0gW107XG5cbiAgICAgICAgdGhpcy5hZGRUYWIgPSBmdW5jdGlvbih0YWJTY29wZSkge1xuICAgICAgICAgIC8vIEZpcnN0IHRhYiBpcyBhbHdheXMgYXV0by1hY3RpdmF0ZWQ7IG90aGVycyBhdXRvLWRlYWN0aXZhdGVkXG4gICAgICAgICAgdGFiU2NvcGUuYWN0aXZlID0gc2VsZi50YWJzLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICBzZWxmLnRhYnMucHVzaCh0YWJTY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zaG93VGFiID0gZnVuY3Rpb24oc2VsZWN0ZWRUYWIpIHtcbiAgICAgICAgICBzZWxmLnRhYnMuZm9yRWFjaChmdW5jdGlvbih0YWIpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCB0YWIsIGRlYWN0aXZhdGUgYWxsIG90aGVyc1xuICAgICAgICAgICAgdGFiLmFjdGl2ZSA9IHRhYiA9PT0gc2VsZWN0ZWRUYWI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICAvLyBFeHBvc2UgY29udHJvbGxlciB0byB0ZW1wbGF0ZXMgYXMgXCJ0YWJzZXRcIlxuICAgICAgY29udHJvbGxlckFzOiAndGFic2V0J1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdCcsIGZ1bmN0aW9uKHZsLCB2ZywgY3FsLCAkdGltZW91dCwgJHEsIERhdGFzZXQsIENvbmZpZywgY29uc3RzLCBfLCAkZG9jdW1lbnQsIExvZ2dlciwgSGVhcCwgJHdpbmRvdykge1xuICAgIHZhciBjb3VudGVyID0gMDtcbiAgICB2YXIgTUFYX0NBTlZBU19TSVpFID0gMzI3NjcvMiwgTUFYX0NBTlZBU19BUkVBID0gMjY4NDM1NDU2LzQ7XG5cbiAgICB2YXIgcmVuZGVyUXVldWUgPSBuZXcgSGVhcChmdW5jdGlvbihhLCBiKXtcbiAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgfSksXG4gICAgICByZW5kZXJpbmcgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGdldFJlbmRlcmVyKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIC8vIHVzZSBjYW52YXMgYnkgZGVmYXVsdCBidXQgdXNlIHN2ZyBpZiB0aGUgdmlzdWFsaXphdGlvbiBpcyB0b28gYmlnXG4gICAgICBpZiAod2lkdGggPiBNQVhfQ0FOVkFTX1NJWkUgfHwgaGVpZ2h0ID4gTUFYX0NBTlZBU19TSVpFIHx8IHdpZHRoKmhlaWdodCA+IE1BWF9DQU5WQVNfQVJFQSkge1xuICAgICAgICByZXR1cm4gJ3N2Zyc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ2NhbnZhcyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy92bHBsb3QvdmxwbG90Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJzwnLFxuICAgICAgICAvKiogQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgaWYgdGhlIHBsb3QgaXMgc3RpbGwgaW4gdGhlIHZpZXcsIHNvIGl0IG1pZ2h0IGJlIG9taXR0ZWQgZnJvbSB0aGUgcmVuZGVyIHF1ZXVlIGlmIG5lY2Vzc2FyeS4gKi9cbiAgICAgICAgaXNJbkxpc3Q6ICc8JyxcbiAgICAgICAgbGlzdFRpdGxlOiAnPCcsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJzwnLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgb3ZlcmZsb3c6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgcmVzY2FsZTogJzwnLFxuICAgICAgICB0aHVtYm5haWw6ICc8JyxcbiAgICAgICAgdG9vbHRpcDogJzwnXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBIT1ZFUl9USU1FT1VUID0gNTAwO1xuICAgICAgICB2YXIgdmlldztcbiAgICAgICAgdmFyIHRvb2x0aXA7XG4gICAgICAgIHZhciBUT09MVElQX0RFTEFZID0gMjAwO1xuXG4gICAgICAgIHNjb3BlLnZsUGxvdEhlaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBlbGVtZW50LmhlaWdodCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnZsUGxvdFdpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQud2lkdGgoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBkZXN0cm95VmlldygpIHtcbiAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgdG9vbHRpcC5kZXN0cm95KCk7IC8vIGRlc3Ryb3kgdG9vbHRpcCAocHJvbWlzZSBhbmQgZXZlbnQgbGlzdG5lcnMpXG4gICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdmVyJyk7XG4gICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdXQnKTtcbiAgICAgICAgICAgIHZpZXcuZGVzdHJveSgpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG5cbiAgICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcbiAgICAgICAgICAgIGlmIChjb25zdHMuZGVidWcgJiYgJHdpbmRvdy52aWV3cykge1xuICAgICAgICAgICAgICBkZWxldGUgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLnZpc0lkID0gKGNvdW50ZXIrKyk7XG5cbiAgICAgICAgdmFyIGhvdmVyUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHZhciByZW5kZXJRdWV1ZU5leHRQcm9taXNlID0gbnVsbDtcblxuICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmRlc3Ryb3llZCA9IGZhbHNlO1xuXG4gICAgICAgIHNjb3BlLm1vdXNlZW50ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1ZFUiwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLHtcbiAgICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSAhc2NvcGUudGh1bWJuYWlsO1xuICAgICAgICAgIH0sIEhPVkVSX1RJTUVPVVQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLm1vdXNlbGVhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuaG92ZXJGb2N1cykge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1VULCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwoaG92ZXJQcm9taXNlKTtcbiAgICAgICAgICBob3ZlclByb21pc2UgPSBudWxsO1xuXG4gICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IHNjb3BlLnVubG9ja2VkID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gb25Ub29sdGlwQXBwZWFyKGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVAsIGl0ZW0uZGF0dW0sIHtcbiAgICAgICAgICAgIHNob3J0aGFuZDogc2NvcGUuY2hhcnQuc2hvcnRoYW5kLFxuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblRvb2x0aXBEaXNhcHBlYXIoZXZlbnQsIGl0ZW0pIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfVE9PTFRJUF9FTkQsIGl0ZW0uZGF0dW0sIHtcbiAgICAgICAgICAgIHNob3J0aGFuZDogc2NvcGUuY2hhcnQuc2hvcnRoYW5kLFxuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWZ1NwZWMoKSB7XG4gICAgICAgICAgdmFyIGNvbmZpZ1NldCA9IHNjb3BlLmNvbmZpZ1NldCB8fCBjb25zdHMuZGVmYXVsdENvbmZpZ1NldCB8fCB7fTtcblxuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQudmxTcGVjKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHZsU3BlYyA9IF8uY2xvbmVEZWVwKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgdmcudXRpbC5leHRlbmQodmxTcGVjLmNvbmZpZywgQ29uZmlnW2NvbmZpZ1NldF0oKSk7XG4gICAgICAgICAgcmV0dXJuIHZsLmNvbXBpbGUodmxTcGVjKS5zcGVjO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmlzRWxlbWVudCgpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzY2FsZUlmRW5hYmxlKCkge1xuICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZ2V0VmlzRWxlbWVudCgpO1xuICAgICAgICAgIGlmIChzY29wZS5yZXNjYWxlKSB7XG4gICAgICAgICAgICAvLyBoYXZlIHRvIGRpZ2VzdCB0aGUgc2NvcGUgdG8gZW5zdXJlIHRoYXRcbiAgICAgICAgICAgIC8vIGVsZW1lbnQud2lkdGgoKSBpcyBib3VuZCBieSBwYXJlbnQgZWxlbWVudCFcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgdmFyIHhSYXRpbyA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgIDAuMixcbiAgICAgICAgICAgICAgICBlbGVtZW50LndpZHRoKCkgLyAgLyogd2lkdGggb2YgdmxwbG90IGJvdW5kaW5nIGJveCAqL1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoIC8qIHdpZHRoIG9mIHRoZSB2aXMgKi9cbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHhSYXRpbyA8IDEpIHtcbiAgICAgICAgICAgICAgdmlzRWxlbWVudC53aWR0aChzY29wZS53aWR0aCAqIHhSYXRpbylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5oZWlnaHQoc2NvcGUuaGVpZ2h0ICogeFJhdGlvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aXNFbGVtZW50LmNzcygndHJhbnNmb3JtJywgbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAuY3NzKCd0cmFuc2Zvcm0tb3JpZ2luJywgbnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2hvcnRoYW5kKCkge1xuICAgICAgICAgIHJldHVybiBzY29wZS5jaGFydC5zaG9ydGhhbmQgfHwgKHNjb3BlLmNoYXJ0LnZsU3BlYyA/IGNxbC5xdWVyeS5zaG9ydGhhbmQudmxTcGVjKHNjb3BlLmNoYXJ0LnZsU3BlYykgOiAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJRdWV1ZU5leHQoKSB7XG4gICAgICAgICAgLy8gcmVuZGVyIG5leHQgaXRlbSBpbiB0aGUgcXVldWVcbiAgICAgICAgICBpZiAocmVuZGVyUXVldWUuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSByZW5kZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIG5leHQucGFyc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3Igc2F5IHRoYXQgbm8gb25lIGlzIHJlbmRlcmluZ1xuICAgICAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXIoc3BlYykge1xuXG4gICAgICAgICAgaWYgKCFzcGVjKSB7XG4gICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHNwZWMuaGVpZ2h0O1xuICAgICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2FuIG5vdCBmaW5kIHZpcyBlbGVtZW50Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gcGFyc2VWZWdhKCkge1xuICAgICAgICAgICAgLy8gaWYgbm8gbG9uZ2VyIGEgcGFydCBvZiB0aGUgbGlzdCwgY2FuY2VsIVxuICAgICAgICAgICAgaWYgKHNjb3BlLmRlc3Ryb3llZCB8fCBzY29wZS5kaXNhYmxlZCB8fCAoc2NvcGUuaXNJbkxpc3QgJiYgc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkgJiYgIXNjb3BlLmlzSW5MaXN0KHNjb3BlLmNoYXJ0KSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbmNlbCByZW5kZXJpbmcnLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIC8vIHJlbmRlciBpZiBzdGlsbCBhIHBhcnQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIHZnLnBhcnNlLnNwZWMoc3BlYywgZnVuY3Rpb24oZXJyb3IsIGNoYXJ0KSB7XG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dFByb21pc2UgPSAkdGltZW91dChyZW5kZXJRdWV1ZU5leHQsIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBlbmRQYXJzZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3lWaWV3KCk7XG4gICAgICAgICAgICAgICAgdmlldyA9IGNoYXJ0KHtlbDogZWxlbWVudFswXX0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdHMudXNlVXJsKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LmRhdGEoe3JhdzogRGF0YXNldC5kYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcblxuICAgICAgICAgICAgICAgIC8vIHJlYWQgd2lkdGggLyBoZWlnaHQgZnJvbSBsYXlvdXRcbiAgICAgICAgICAgICAgICB2YXIgbGF5b3V0ID0gdmlldy5kYXRhKCdsYXlvdXQnKS52YWx1ZXMoKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcmVuZGVyZXIgPSBnZXRSZW5kZXJlcihsYXlvdXQud2lkdGgsIGxheW91dC5oZWlnaHQpO1xuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJlciA9PT0gJ3N2ZycpIHtcbiAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyZXIocmVuZGVyZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICAgICAgICAgIC8vIHJlYWQgIDxjYW52YXM+Lzxzdmc+4oCZcyB3aWR0aCBhbmQgaGVpZ2h0LCB3aGljaCBpcyB2ZWdhJ3Mgb3V0ZXIgd2lkdGggYW5kIGhlaWdodCB0aGF0IGluY2x1ZGVzIGF4ZXMgYW5kIGxlZ2VuZHNcbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCA9ICB2aXNFbGVtZW50LndpZHRoKCk7XG4gICAgICAgICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gdmlzRWxlbWVudC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb25zdHMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3MgPSAkd2luZG93LnZpZXdzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdID0gdmlldztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfUkVOREVSLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc2NhbGVJZkVuYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVuZENoYXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlIHNwZWMnLCAoZW5kUGFyc2Utc3RhcnQpLCAnY2hhcnRpbmcnLCAoZW5kQ2hhcnQtZW5kUGFyc2UpLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS50b29sdGlwKSB7XG4gICAgICAgICAgICAgICAgICAvLyB1c2UgdmVnYS10b29sdGlwXG4gICAgICAgICAgICAgICAgICB0b29sdGlwID0gdmwudG9vbHRpcCh2aWV3LCBzY29wZS5jaGFydC52bFNwZWMsIHtcbiAgICAgICAgICAgICAgICAgICAgb25BcHBlYXI6IG9uVG9vbHRpcEFwcGVhcixcbiAgICAgICAgICAgICAgICAgICAgb25EaXNhcHBlYXI6IG9uVG9vbHRpcERpc2FwcGVhcixcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IFRPT0xUSVBfREVMQVlcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dFByb21pc2UgPSAkdGltZW91dChyZW5kZXJRdWV1ZU5leHQsIDEpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghcmVuZGVyaW5nKSB7IC8vIGlmIG5vIGluc3RhbmNlIGlzIGJlaW5nIHJlbmRlciAtLSByZW5kZXJpbmcgbm93XG4gICAgICAgICAgICByZW5kZXJpbmc9dHJ1ZTtcbiAgICAgICAgICAgIHBhcnNlVmVnYSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgcXVldWUgaXRcbiAgICAgICAgICAgIHJlbmRlclF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICBwcmlvcml0eTogc2NvcGUucHJpb3JpdHkgfHwgMCxcbiAgICAgICAgICAgICAgcGFyc2U6IHBhcnNlVmVnYVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNwZWNXYXRjaGVyID0gc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgICAgcmV0dXJuIF8ub21pdChzY29wZS5jaGFydC52bFNwZWMsICdkYXRhJyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzcGVjID0gc2NvcGUuY2hhcnQudmdTcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC5jbGVhblNwZWMpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICAgICBzY29wZS5jaGFydC5jbGVhblNwZWMgPSBzY29wZS5jaGFydC52bFNwZWM7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIGRlc3Ryb3lWaWV3KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGhvdmVyUHJvbWlzZSkge1xuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgICBob3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGlmIChyZW5kZXJRdWV1ZU5leHRQcm9taXNlKSB7XG4gICAgICAgICAgLy8gICAkdGltZW91dC5jYW5jZWwocmVuZGVyUXVldWVOZXh0UHJvbWlzZSk7XG4gICAgICAgICAgLy8gICByZW5kZXJRdWV1ZU5leHRQcm9taXNlID0gbnVsbDtcbiAgICAgICAgICAvLyB9XG5cbiAgICAgICAgICBzY29wZS5kZXN0cm95ZWQgPSB0cnVlO1xuICAgICAgICAgIC8vIEZJWE1FIGFub3RoZXIgd2F5IHRoYXQgc2hvdWxkIGVsaW1pbmF0ZSB0aGluZ3MgZnJvbSBtZW1vcnkgZmFzdGVyIHNob3VsZCBiZSByZW1vdmluZ1xuICAgICAgICAgIC8vIG1heWJlIHNvbWV0aGluZyBsaWtlXG4gICAgICAgICAgLy8gcmVuZGVyUXVldWUuc3BsaWNlKHJlbmRlclF1ZXVlLmluZGV4T2YocGFyc2VWZWdhKSwgMSkpO1xuICAgICAgICAgIC8vIGJ1dCB3aXRob3V0IHByb3BlciB0ZXN0aW5nLCB0aGlzIGlzIHJpc2tpZXIgdGhhbiBzZXR0aW5nIHNjb3BlLmRlc3Ryb3llZC5cblxuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJcbiAgICAgICAgICBzcGVjV2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZGlyZWN0aXZlOnZpc0xpc3RJdGVtXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdmlzTGlzdEl0ZW1cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3RHcm91cCcsIGZ1bmN0aW9uIChCb29rbWFya3MsIGNvbnN0cywgdmcsIHZsLCBEYXRhc2V0LCBMb2dnZXIsIF8sIFBpbGxzLCBDaGFydCwgJHRpbWVvdXQsIE1vZGFscykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5nZXREcm9wVGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJy5mYS13cmVuY2gnKVswXTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBzY29wZToge1xuICAgICAgICAvKiBwYXNzIHRvIHZscGxvdCAqKi9cbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPCcsXG4gICAgICAgIGlzSW5MaXN0OiAnPCcsXG4gICAgICAgIGxpc3RUaXRsZTogJzwnLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc8JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIGVuYWJsZVBpbGxzUHJldmlldzogJzwnLFxuICAgICAgICBvdmVyZmxvdzogJzwnLFxuICAgICAgICBwcmlvcml0eTogJzwnLFxuICAgICAgICByZXNjYWxlOiAnPCcsXG4gICAgICAgIHRodW1ibmFpbDogJzwnLFxuICAgICAgICB0b29sdGlwOiAnPCcsXG5cbiAgICAgICAgLyogdmxwbG90Z3JvdXAgc3BlY2lmaWMgKi9cblxuICAgICAgICAvKiogU2V0IG9mIGZpZWxkRGVmcyBmb3Igc2hvd2luZyBmaWVsZCBpbmZvLiAgRm9yIFZveWFnZXIyLCB0aGlzIG1pZ2h0IGJlIGp1c3QgYSBzdWJzZXQgb2YgZmllbGRzIHRoYXQgYXJlIGFtYmlndW91cy4gKi9cbiAgICAgICAgZmllbGRTZXQ6ICc8JyxcblxuICAgICAgICBzaG93Qm9va21hcms6ICc8JyxcbiAgICAgICAgc2hvd0RlYnVnOiAnPCcsXG4gICAgICAgIHNob3dFeHBhbmQ6ICc8JyxcbiAgICAgICAgc2hvd0ZpbHRlck51bGw6ICc8JyxcbiAgICAgICAgc2hvd0xhYmVsOiAnPCcsXG4gICAgICAgIHNob3dMb2c6ICc8JyxcbiAgICAgICAgc2hvd1NlbGVjdDogJzwnLFxuICAgICAgICBzaG93U29ydDogJzwnLFxuICAgICAgICBzaG93VHJhbnNwb3NlOiAnPCcsXG5cbiAgICAgICAgLyoqIFdoZXRoZXIgdGhlIGxvZyAvIHRyYW5zcG9zZSBzb3J0IGNhdXNlIHNpZGUgZWZmZWN0IHRvIHRoZSBzaGVsZiAgKi9cbiAgICAgICAgdG9nZ2xlU2hlbGY6ICc8JyxcblxuICAgICAgICBhbHdheXNTZWxlY3RlZDogJzwnLFxuICAgICAgICBpc1NlbGVjdGVkOiAnPCcsXG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPCcsXG4gICAgICAgIGV4cGFuZEFjdGlvbjogJyYnLFxuICAgICAgICBzZWxlY3RBY3Rpb246ICcmJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuXG5cbiAgICAgICAgLy8gYm9va21hcmsgYWxlcnRcbiAgICAgICAgc2NvcGUuc2hvd0Jvb2ttYXJrQWxlcnQgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUudG9nZ2xlQm9va21hcmsgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgIGlmIChCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZCkpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gIXNjb3BlLnNob3dCb29rbWFya0FsZXJ0OyAvLyB0b2dnbGUgYWxlcnRcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBCb29rbWFya3MuYWRkKGNoYXJ0LCBzY29wZS5saXN0VGl0bGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZmllbGRIb3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICB2YXIgcHJldmlld1Byb21pc2UgPSBudWxsO1xuXG4gICAgICAgIHNjb3BlLmVuYWJsZVByZXZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBwcmV2aWV3UHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmVuYWJsZVBpbGxzUHJldmlldykge1xuICAgICAgICAgICAgICBQaWxscy5wcmV2aWV3KHRydWUsIHNjb3BlLmNoYXJ0LCBzY29wZS5saXN0VGl0bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIDUwMCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5kaXNhYmxlUHJldmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChwcmV2aWV3UHJvbWlzZSkge1xuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHByZXZpZXdQcm9taXNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJldmlld1Byb21pc2UgPSBudWxsO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLmVuYWJsZVBpbGxzUHJldmlldykge1xuICAgICAgICAgICAgUGlsbHMucHJldmlldyhmYWxzZSwgc2NvcGUuY2hhcnQsIHNjb3BlLmxpc3RUaXRsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb01vdXNlb3ZlciA9IGZ1bmN0aW9uKGZpZWxkRGVmLCBpbmRleCkge1xuICAgICAgICAgIGZpZWxkSG92ZXJQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBMaW5rIHRvIG9yaWdpbmFsIGZpZWxkIGluIHRoZSBDUUwtYmFzZWQgc3BlY1xuICAgICAgICAgICAgaWYgKHNjb3BlLmNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgICAgdmFyIGVudW1TcGVjSW5kZXggPSBzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4O1xuICAgICAgICAgICAgICBpZiAoZW51bVNwZWNJbmRleC5lbmNvZGluZ3MgJiYgZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZEVudW1TcGVjTmFtZSA9IGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZC5uYW1lO1xuICAgICAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRW51bVNwZWNOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJRUxEREVGX0hJR0hMSUdIVEVELCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgaGlnaGxpZ2h0ZWRGaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZEluZm9Nb3VzZW91dCA9IGZ1bmN0aW9uKGZpZWxkRGVmLCBpbmRleCkge1xuICAgICAgICAgIGlmIChmaWVsZEhvdmVyUHJvbWlzZSkge1xuICAgICAgICAgICAgLy8gaWYgd2UgdW5ob3ZlciB3aXRoaW5cbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChmaWVsZEhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpZWxkSG92ZXJQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIGlmICgoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0pIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgcHJldmlldyBpZiBpdCdzIGVuYWJsZWRcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GSUVMRERFRl9VTkhJR0hMSUdIVEVELCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgaGlnaGxpZ2h0ZWRGaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBVbmxpbmsgTGluayB0byBvcmlnaW5hbCBmaWVsZCBpbiB0aGUgQ1FMLWJhc2VkIHNwZWNcbiAgICAgICAgICAgIGlmIChzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICAgIHZhciBlbnVtU3BlY0luZGV4ID0gc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleDtcbiAgICAgICAgICAgICAgaWYgKGVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRFbnVtU3BlY05hbWUgPSBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQubmFtZTtcbiAgICAgICAgICAgICAgICBkZWxldGUgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGRFbnVtU3BlY05hbWVdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmlzRW51bWVyYXRlZEZpZWxkID0gZnVuY3Rpb24oY2hhcnQsIGluZGV4KSB7XG4gICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmlzRW51bWVyYXRlZENoYW5uZWwgPSBmdW5jdGlvbihjaGFydCwgaW5kZXgpIHtcbiAgICAgICAgICBpZiAoY2hhcnQuZW51bVNwZWNJbmRleCkge1xuICAgICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSkge1xuICAgICAgICAgICAgICByZXR1cm4gY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmNoYW5uZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5zZWxlY3QgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TUEVDX1NFTEVDVCwgY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBQaWxscy5zZWxlY3QoY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICBpZiAoc2NvcGUuJHBhcmVudC5wb3N0U2VsZWN0QWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS4kcGFyZW50LnBvc3RTZWxlY3RBY3Rpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgTW9kYWxzLmNsb3NlKCdib29rbWFyay1saXN0Jyk7IC8vIEhBQ0s6IHRoaXMgbGluZSBpcyBvbmx5IG5lY2Vzc2FyeSB3aGVuIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYm9va21hcmsgbGlzdFxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZUJvb2ttYXJrID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBCb29rbWFya3MucmVtb3ZlKGNoYXJ0KTtcbiAgICAgICAgICBzY29wZS5zaG93Qm9va21hcmtBbGVydCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmtlZXBCb29rbWFyayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IFBpbGxzLmdldChjaGFubmVsKSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGREZWYuc2NhbGUgPSBmaWVsZERlZi5zY2FsZSB8fCB7fTtcblxuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMucmVzY2FsZShjaGFubmVsLCBzY2FsZS50eXBlID09PSAnbG9nJyA/ICdsaW5lYXInIDogJ2xvZycpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY2FsZS50eXBlID0gc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5MT0dfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgUGlsbHMuc2V0KGNoYW5uZWwsIGZpZWxkRGVmLCB0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgY2hhbm5lbCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZERlZi5zY2FsZTtcblxuICAgICAgICAgIHJldHVybiBzY2FsZSAmJiBzY2FsZS50eXBlID09PSAnbG9nJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgRklMVEVSXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlRmlsdGVyTnVsbCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTlVMTF9GSUxURVJfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy50b2dnbGVGaWx0ZXJJbnZhbGlkKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwZWMudHJhbnNmb3JtID0gc3BlYy50cmFuc2Zvcm0gfHwge307XG4gICAgICAgICAgICBzcGVjLnRyYW5zZm9ybS5maWx0ZXJJbnZhbGlkID0gc3BlYy50cmFuc2Zvcm0uZmlsdGVySW52YWxpZCA9PT0gdHJ1ZSA/IHVuZGVmaW5lZCA6IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWZzID0gdmwuc3BlYy5maWVsZERlZnMoc3BlYyk7XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBmaWVsZERlZnMpIHtcbiAgICAgICAgICAgIHZhciBmaWVsZERlZiA9IGZpZWxkRGVmc1tpXTtcbiAgICAgICAgICAgIGlmIChfLmluY2x1ZGVzKFt2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sIGZpZWxkRGVmLnR5cGUpICYmIERhdGFzZXQuc2NoZW1hLnN0YXRzKGZpZWxkRGVmKS5taXNzaW5nID4gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlU29ydCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0ge307XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlcyA9IFsnb3JkaW5hbC1hc2NlbmRpbmcnLCAnb3JkaW5hbC1kZXNjZW5kaW5nJyxcbiAgICAgICAgICAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycsICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycsICdjdXN0b20nXTtcblxuICAgICAgICB0b2dnbGVTb3J0LnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMpIHtcblxuICAgICAgICAgIHZhciBjdXJyZW50TW9kZSA9IHRvZ2dsZVNvcnQubW9kZShzcGVjKTtcbiAgICAgICAgICB2YXIgY3VycmVudE1vZGVJbmRleCA9IHRvZ2dsZVNvcnQubW9kZXMuaW5kZXhPZihjdXJyZW50TW9kZSk7XG5cbiAgICAgICAgICB2YXIgbmV3TW9kZUluZGV4ID0gKGN1cnJlbnRNb2RlSW5kZXggKyAxKSAlICh0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgIHZhciBuZXdNb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tuZXdNb2RlSW5kZXhdO1xuXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNPUlRfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGN1cnJlbnRNb2RlOiBjdXJyZW50TW9kZSxcbiAgICAgICAgICAgIG5ld01vZGU6IG5ld01vZGUsXG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG5cbiAgICAgICAgICBpZiAoc2NvcGUudG9nZ2xlU2hlbGYpIHtcbiAgICAgICAgICAgIFBpbGxzLnNvcnQoY2hhbm5lbHMub3JkaW5hbCwgdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0ID0gdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKiogR2V0IHNvcnQgcHJvcGVydHkgZGVmaW5pdGlvbiB0aGF0IG1hdGNoZXMgZWFjaCBtb2RlLiAqL1xuICAgICAgICB0b2dnbGVTb3J0LmdldFNvcnQgPSBmdW5jdGlvbihtb2RlLCBzcGVjKSB7XG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnZGVzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgcUVuY0RlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMucXVhbnRpdGF0aXZlXTtcblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnYXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdkZXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgc29ydCA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydDtcblxuICAgICAgICAgIGlmIChzb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnb3JkaW5hbC1hc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxIDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBzb3J0IG1hdGNoZXMgYW55IG9mIHRoZSBzb3J0IGZvciBlYWNoIG1vZGUgZXhjZXB0ICdjdXN0b20nLlxuICAgICAgICAgICAgdmFyIG1vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIHNvcnRPZk1vZGUgPSB0b2dnbGVTb3J0LmdldFNvcnQobW9kZSwgc3BlYyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRXF1YWwoc29ydCwgc29ydE9mTW9kZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHZnLnV0aWwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nO1xuXG4gICAgICAgICAgaWYgKHZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3JvdycpIHx8IHZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ2NvbHVtbicpIHx8XG4gICAgICAgICAgICAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneCcpIHx8ICF2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICd5JykgfHxcbiAgICAgICAgICAgICF2bC5lbmNvZGluZy5pc0FnZ3JlZ2F0ZShzcGVjLmVuY29kaW5nKSkgeyAvLyBGSVhNRSByZXBsYWNlIHRoaXMgcHJvcGVyIGFsd2F5c05vT2NjbHVzaW9uIG1ldGhvZFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLnkpXG4gICAgICAgICAgICApID8gJ3gnIDpcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgKGVuY29kaW5nLnkudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IGVuY29kaW5nLnkudHlwZSA9PT0gdmwudHlwZS5PUkRJTkFMKSAmJlxuICAgICAgICAgICAgICB2bC5maWVsZERlZi5pc01lYXN1cmUoZW5jb2RpbmcueClcbiAgICAgICAgICAgICkgPyAneScgOiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVTb3J0Q2xhc3MgPSBmdW5jdGlvbih2bFNwZWMpIHtcbiAgICAgICAgICBpZiAoIXZsU3BlYyB8fCAhdG9nZ2xlU29ydC5zdXBwb3J0KHZsU3BlYykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaW52aXNpYmxlJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgb3JkaW5hbENoYW5uZWwgPSB2bFNwZWMgJiYgdG9nZ2xlU29ydC5jaGFubmVscyh2bFNwZWMpLm9yZGluYWwsXG4gICAgICAgICAgICBtb2RlID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQubW9kZSh2bFNwZWMpO1xuXG4gICAgICAgICAgdmFyIGRpcmVjdGlvbkNsYXNzID0gb3JkaW5hbENoYW5uZWwgPT09ICd4JyA/ICdzb3J0LXggJyA6ICcnO1xuXG4gICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWFzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFscGhhLWFzYyc7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWRlc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1kZXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbW91bnQtYXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWRlc2MnO1xuICAgICAgICAgICAgZGVmYXVsdDogLy8gY3VzdG9tXG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0JztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudHJhbnNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlRSQU5TUE9TRV9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy50cmFuc3Bvc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ2hhcnQudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5jaGFydCA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwUG9wdXAnLCBmdW5jdGlvbiAoRHJvcCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBMaXN0JywgZnVuY3Rpb24gKHZsLCBjcWwsIGpRdWVyeSwgY29uc3RzLCBfLCBMb2dnZXIsIFBpbGxzLCBDaGFydCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyoqIEFuIGluc3RhbmNlIG9mIHNwZWNRdWVyeU1vZGVsR3JvdXAgKi9cbiAgICAgICAgZW5hYmxlUGlsbHNQcmV2aWV3OiAnPCcsXG4gICAgICAgIGluaXRpYWxMaW1pdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcbiAgICAgICAgaGlkZUxpc3RUaXRsZTogJzwnLFxuICAgICAgICBjaGFydHM6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgc2hvd01vcmU6ICc8JyxcbiAgICAgICAgcG9zdFNlbGVjdEFjdGlvbjogJyYnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5saW1pdCA9IHNjb3BlLmluaXRpYWxMaW1pdCB8fCAzO1xuXG4gICAgICAgIC8vIEZ1bmN0aW9uc1xuICAgICAgICBzY29wZS5nZXRDaGFydCA9IENoYXJ0LmdldENoYXJ0O1xuICAgICAgICBzY29wZS5pbmNyZWFzZUxpbWl0ID0gaW5jcmVhc2VMaW1pdDtcbiAgICAgICAgc2NvcGUuaXNJbmxpc3QgPSBpc0luTGlzdDtcbiAgICAgICAgc2NvcGUuUGlsbHMgPSBQaWxscztcblxuICAgICAgICAvLyBlbGVtZW50LmJpbmQoJ3Njcm9sbCcsIGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vICAgIGlmKGpRdWVyeSh0aGlzKS5zY3JvbGxUb3AoKSArIGpRdWVyeSh0aGlzKS5pbm5lckhlaWdodCgpID49IGpRdWVyeSh0aGlzKVswXS5zY3JvbGxIZWlnaHQpe1xuICAgICAgICAvLyAgICAgaWYgKHNjb3BlLmxpbWl0IDwgc2NvcGUubW9kZWxHcm91cC5jaGFydHMubGVuZ3RoKSB7XG4gICAgICAgIC8vICAgICAgIHNjb3BlLmluY3JlYXNlTGltaXQoKTtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvLyB9KTtcblxuICAgICAgICBmdW5jdGlvbiBpbmNyZWFzZUxpbWl0KCkge1xuICAgICAgICAgIHNjb3BlLmxpbWl0ICs9IDU7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkxPQURfTU9SRSwgc2NvcGUubGltaXQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqIHJldHVybiBpZiB0aGUgcGxvdCBpcyBzdGlsbCBpbiB0aGUgdmlldywgc28gaXQgbWlnaHQgYmUgb21pdHRlZCBmcm9tIHRoZSByZW5kZXIgcXVldWUgaWYgbmVjZXNzYXJ5LiAqL1xuICAgICAgICBmdW5jdGlvbiBpc0luTGlzdChjaGFydCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2NvcGUuY2hhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihjaGFydC5zaG9ydGhhbmQgPT09IHNjb3BlLmNoYXJ0c1tpXS5zaG9ydGhhbmQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2NvbXBhY3RKU09OJywgZnVuY3Rpb24oSlNPTjMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBKU09OMy5zdHJpbmdpZnkoaW5wdXQsIG51bGwsICcgICcsIDgwKTtcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmVuY29kZVVyaVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZW5jb2RlVXJpXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdlbmNvZGVVUkknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5lbmNvZGVVUkkoaW5wdXQpO1xuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSBmYWNldGVkdml6LmZpbHRlcjpyZXBvcnRVcmxcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHJlcG9ydFVybFxuICogRmlsdGVyIGluIHRoZSBmYWNldGVkdml6LlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ3JlcG9ydFVybCcsIGZ1bmN0aW9uIChjb21wYWN0SlNPTkZpbHRlciwgXywgY29uc3RzKSB7XG4gICAgZnVuY3Rpb24gdm95YWdlclJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xVDlaQTE0RjNtbXpySFI3SkpWVUt5UFh6ck1xRjU0Q2pMSU9qdjJFN1pFTS92aWV3Zm9ybT8nO1xuXG4gICAgICBpZiAocGFyYW1zLmZpZWxkcykge1xuICAgICAgICB2YXIgcXVlcnkgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoXy52YWx1ZXMocGFyYW1zLmZpZWxkcykpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBxdWVyeSArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEzMjM2ODAxMzY9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuc3BlYzIpIHtcbiAgICAgICAgdmFyIHNwZWMyID0gXy5vbWl0KHBhcmFtcy5zcGVjMiwgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjMiA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjMikpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5Ljg1MzEzNzc4Nj0nICsgc3BlYzIgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIHZhciB0eXBlUHJvcCA9ICdlbnRyeS4xOTQwMjkyNjc3PSc7XG4gICAgICBzd2l0Y2ggKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3ZsJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnVmlzdWFsaXphdGlvbitSZW5kZXJpbmcrKFZlZ2FsaXRlKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd2cic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK0FsZ29yaXRobSsoVmlzcmVjKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK1VJKyhGYWNldGVkVml6KSYnO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZsdWlSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMXhLcy1xR2FMWkVVZmJUbWhkbVNvUzEzT0tPRXB1dV9OTldFNVRBQW1sX1kvdmlld2Zvcm0/JztcbiAgICAgIGlmIChwYXJhbXMuc3BlYykge1xuICAgICAgICB2YXIgc3BlYyA9IF8ub21pdChwYXJhbXMuc3BlYywgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBzcGVjICsgJyYnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uc3RzLmFwcElkID09PSAndm95YWdlcicgPyB2b3lhZ2VyUmVwb3J0IDogdmx1aVJlcG9ydDtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6dW5kZXJzY29yZTJzcGFjZVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdW5kZXJzY29yZTJzcGFjZVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigndW5kZXJzY29yZTJzcGFjZScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gaW5wdXQgPyBpbnB1dC5yZXBsYWNlKC9fKy9nLCAnICcpIDogJyc7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0ID0gW107XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMuaXNTdXBwb3J0ZWQgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzU3VwcG9ydGVkO1xuICAgIH07XG5cbiAgICB2YXIgcHJvdG8gPSBCb29rbWFya3MucHJvdG90eXBlO1xuXG4gICAgcHJvdG8uc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZS5zZXQoJ2Jvb2ttYXJrTGlzdCcsIHRoaXMubGlzdCk7XG4gICAgfTtcblxuICAgIHByb3RvLnNhdmVBbm5vdGF0aW9ucyA9IF8udGhyb3R0bGUoZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbihib29rbWFyaykgeyByZXR1cm4gYm9va21hcmsuc2hvcnRoYW5kID09PSBzaG9ydGhhbmQ7IH0pXG4gICAgICAgIC5jaGFydC5hbm5vdGF0aW9uID0gdGhpcy5kaWN0W3Nob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sIDEwMDAsIHt0cmFpbGluZzogdHJ1ZX0pO1xuXG4gICAgLy8gZXhwb3J0IGFsbCBib29rbWFya3MgYW5kIGFubm90YXRpb25zXG4gICAgcHJvdG8uZXhwb3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZGljdGlvbmFyeSA9IHRoaXMuZGljdDtcblxuICAgICAgLy8gcHJlcGFyZSBleHBvcnQgZGF0YVxuICAgICAgdmFyIGV4cG9ydFNwZWNzID0gW107XG4gICAgICBfLmZvckVhY2godGhpcy5saXN0LCBmdW5jdGlvbihib29rbWFyaykge1xuICAgICAgICB2YXIgc3BlYyA9IGJvb2ttYXJrLmNoYXJ0LnZsU3BlYztcbiAgICAgICAgc3BlYy5kZXNjcmlwdGlvbiA9IGRpY3Rpb25hcnlbYm9va21hcmsuc2hvcnRoYW5kXS5hbm5vdGF0aW9uO1xuICAgICAgICBleHBvcnRTcGVjcy5wdXNoKHNwZWMpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIHdyaXRlIGV4cG9ydCBkYXRhIGluIGEgbmV3IHRhYlxuICAgICAgdmFyIGV4cG9ydFdpbmRvdyA9IHdpbmRvdy5vcGVuKCk7XG4gICAgICBleHBvcnRXaW5kb3cuZG9jdW1lbnQub3BlbigpO1xuICAgICAgZXhwb3J0V2luZG93LmRvY3VtZW50LndyaXRlKCc8aHRtbD48Ym9keT48cHJlPicgKyBKU09OLnN0cmluZ2lmeShleHBvcnRTcGVjcywgbnVsbCwgMikgKyAnPC9wcmU+PC9ib2R5PjwvaHRtbD4nKTtcbiAgICAgIGV4cG9ydFdpbmRvdy5kb2N1bWVudC5jbG9zZSgpO1xuICAgIH07XG5cbiAgICBwcm90by5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxpc3QgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCgnYm9va21hcmtMaXN0JykgfHwgW107XG5cbiAgICAgIC8vIHBvcHVsYXRlIHRoaXMuZGljdFxuICAgICAgdmFyIGRpY3Rpb25hcnkgPSB0aGlzLmRpY3Q7XG4gICAgICBfLmZvckVhY2godGhpcy5saXN0LCBmdW5jdGlvbihib29rbWFyaykge1xuICAgICAgICBkaWN0aW9uYXJ5W2Jvb2ttYXJrLnNob3J0aGFuZF0gPSBfLmNsb25lRGVlcChib29rbWFyay5jaGFydCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcHJvdG8uY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubGlzdC5zcGxpY2UoMCwgdGhpcy5saXN0Lmxlbmd0aCk7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQ0xFQVIpO1xuICAgIH07XG5cbiAgICBwcm90by5hZGQgPSBmdW5jdGlvbihjaGFydCwgbGlzdFRpdGxlKSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuICAgICAgY2hhcnQudGltZUFkZGVkID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcblxuICAgICAgLy8gRklYTUU6IHRoaXMgaXMgbm90IGFsd2F5cyBhIGdvb2QgaWRlYVxuICAgICAgY2hhcnQuc2NoZW1hID0gRGF0YXNldC5zY2hlbWE7XG5cbiAgICAgIHRoaXMuZGljdFtjaGFydC5zaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoY2hhcnQpO1xuXG4gICAgICB0aGlzLmxpc3QucHVzaCh7XG4gICAgICAgIHNob3J0aGFuZDogc2hvcnRoYW5kLFxuICAgICAgICBsaXN0OiBsaXN0VGl0bGUsXG4gICAgICAgIGNoYXJ0OiBfLmNsb25lRGVlcChjaGFydClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0FERCwgc2hvcnRoYW5kLCB7XG4gICAgICAgIGxpc3Q6IGxpc3RUaXRsZVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICAvLyByZW1vdmUgYm9va21hcmsgZnJvbSB0aGlzLmxpc3RcbiAgICAgIHZhciBpbmRleCA9IHRoaXMubGlzdC5maW5kSW5kZXgoZnVuY3Rpb24oYm9va21hcmspIHsgcmV0dXJuIGJvb2ttYXJrLnNob3J0aGFuZCA9PT0gc2hvcnRoYW5kOyB9KTtcbiAgICAgIHZhciByZW1vdmVkO1xuICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgcmVtb3ZlZCA9IHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEpWzBdO1xuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgYm9va21hcmsgZnJvbSB0aGlzLmRpY3RcbiAgICAgIGRlbGV0ZSB0aGlzLmRpY3RbY2hhcnQuc2hvcnRoYW5kXTtcblxuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19SRU1PVkUsIHNob3J0aGFuZCwge1xuICAgICAgICBsaXN0OiAocmVtb3ZlZCB8fCB7fSkubGlzdFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHByb3RvLnJlb3JkZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH07XG5cbiAgICBwcm90by5pc0Jvb2ttYXJrZWQgPSBmdW5jdGlvbihzaG9ydGhhbmQpIHtcbiAgICAgIHJldHVybiB0aGlzLmRpY3QuaGFzT3duUHJvcGVydHkoc2hvcnRoYW5kKTtcbiAgICB9O1xuXG4gICAgcHJvdG8ubG9nQm9va21hcmtzQ2xvc2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQ0xPU0UpO1xuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IEJvb2ttYXJrcygpO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnQ2hhcnQnLCBmdW5jdGlvbiAoY3FsLCBfKSB7XG4gICAgdmFyIENoYXJ0ID0ge1xuICAgICAgZ2V0Q2hhcnQ6IGdldENoYXJ0LFxuICAgICAgdHJhbnNwb3NlOiB0cmFuc3Bvc2VcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1NwZWNRdWVyeU1vZGVsR3JvdXAgfCBTcGVjUXVlcnlNb2RlbH0gaXRlbVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldENoYXJ0KGl0ZW0pIHtcbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC8qKiBAdHlwZSB7T2JqZWN0fSBjb25jaXNlIHNwZWMgZ2VuZXJhdGVkICovXG4gICAgICAgICAgdmxTcGVjOiBudWxsLFxuICAgICAgICAgIGZpZWxkU2V0OiBudWxsLFxuXG4gICAgICAgICAgLyoqIEB0eXBlIHtTdHJpbmd9IGdlbmVyYXRlZCB2bCBzaG9ydGhhbmQgKi9cbiAgICAgICAgICBzaG9ydGhhbmQ6IG51bGwsXG4gICAgICAgICAgZW51bVNwZWNJbmRleDogbnVsbFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICB2YXIgc3BlY00gPSBpdGVtIGluc3RhbmNlb2YgY3FsLm1vZGVsLlNwZWNRdWVyeU1vZGVsR3JvdXAgP1xuICAgICAgICBpdGVtLmdldFRvcFNwZWNRdWVyeU1vZGVsKCk6XG4gICAgICAgIGl0ZW07XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbnVtU3BlY0luZGV4OiBzcGVjTS5lbnVtU3BlY0luZGV4LFxuICAgICAgICBmaWVsZFNldDogc3BlY00uc3BlY1F1ZXJ5LmVuY29kaW5ncyxcbiAgICAgICAgdmxTcGVjOiBzcGVjTS50b1NwZWMoKSxcbiAgICAgICAgc2hvcnRoYW5kOiBzcGVjTS50b1Nob3J0aGFuZCgpXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zcG9zZShzcGVjKSB7XG4gICAgICB2YXIgZW5jb2RpbmcgPSBfLmNsb25lKHNwZWMuZW5jb2RpbmcpO1xuICAgICAgdmFyIG9sZFhFbmMgPSBlbmNvZGluZy54O1xuICAgICAgdmFyIG9sZFlFbmMgPSBlbmNvZGluZy55O1xuICAgICAgZW5jb2RpbmcueSA9IG9sZFhFbmM7XG4gICAgICBlbmNvZGluZy54ID0gb2xkWUVuYztcblxuICAgICAgdmFyIG9sZFJvd0VuYyA9IGVuY29kaW5nLnJvdztcbiAgICAgIHZhciBvbGRDb2xFbmMgPSBlbmNvZGluZy5jb2x1bW47XG4gICAgICBlbmNvZGluZy5yb3cgPSBvbGRDb2xFbmM7XG4gICAgICBlbmNvZGluZy5jb2x1bW4gPSBvbGRSb3dFbmM7XG5cbiAgICAgIHNwZWMuZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgICB9XG5cbiAgICByZXR1cm4gQ2hhcnQ7XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VydmljZSBmb3IgdGhlIHNwZWMgY29uZmlnLlxuLy8gV2Uga2VlcCB0aGlzIHNlcGFyYXRlIHNvIHRoYXQgY2hhbmdlcyBhcmUga2VwdCBldmVuIGlmIHRoZSBzcGVjIGNoYW5nZXMuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdDb25maWcnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgQ29uZmlnID0ge307XG5cbiAgICBDb25maWcuZGF0YSA9IHt9O1xuICAgIENvbmZpZy5jb25maWcgPSB7fTtcblxuICAgIENvbmZpZy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmdldERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBDb25maWcuZGF0YTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmxhcmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgd2lkdGg6IDMwMCxcbiAgICAgICAgICBoZWlnaHQ6IDMwMFxuICAgICAgICB9LFxuICAgICAgICBmYWNldDoge1xuICAgICAgICAgIGNlbGw6IHtcbiAgICAgICAgICAgIHdpZHRoOiAxNTAsXG4gICAgICAgICAgICBoZWlnaHQ6IDE1MFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnNtYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBmYWNldDoge1xuICAgICAgICAgIGNlbGw6IHtcbiAgICAgICAgICAgIHdpZHRoOiAxNTAsXG4gICAgICAgICAgICBoZWlnaHQ6IDE1MFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0LCB0eXBlKSB7XG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudmFsdWVzID0gZGF0YXNldC52YWx1ZXM7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS51cmw7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBDb25maWcuZGF0YS51cmwgPSBkYXRhc2V0LnVybDtcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnZhbHVlcztcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHR5cGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBDb25maWc7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdGaWx0ZXJNYW5hZ2VyJywgZnVuY3Rpb24gKF8sIHZsLCBEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvKiogbG9jYWwgb2JqZWN0IGZvciB0aGlzIG9iamVjdCAqL1xuICAgIHNlbGYuZmlsdGVySW5kZXggPSB7fTtcblxuICAgIHRoaXMudG9nZ2xlID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIGlmICghc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0pIHtcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0gPSBpbml0RmlsdGVyKGZpZWxkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuZmlsdGVySW5kZXhbZmllbGRdLmVuYWJsZWQgPSAhc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0uZW5hYmxlZDtcbiAgICAgIH1cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0uZW5hYmxlZCA/IExvZ2dlci5hY3Rpb25zLkZJTFRFUl9FTkFCTEVEIDogTG9nZ2VyLmFjdGlvbnMuRklMVEVSX0RJU0FCTEVELFxuICAgICAgICBmaWVsZCxcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF1cbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMucmVzZXQgPSBmdW5jdGlvbihvbGRGaWx0ZXIsIGhhcmQpIHtcbiAgICAgIGlmIChoYXJkKSB7XG4gICAgICAgIHNlbGYuZmlsdGVySW5kZXggPSB7fTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF8uZm9yRWFjaChzZWxmLmZpbHRlckluZGV4LCBmdW5jdGlvbih2YWx1ZSwgZmllbGQpIHtcbiAgICAgICAgICBkZWxldGUgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAob2xkRmlsdGVyKSB7XG4gICAgICAgIG9sZEZpbHRlci5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgIHNlbGYuZmlsdGVySW5kZXhbZmlsdGVyLmZpZWxkXSA9IHZsLnV0aWwuZXh0ZW5kKHtlbmFibGVkOiB0cnVlfSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmLmZpbHRlckluZGV4O1xuICAgIH07XG5cbiAgICB0aGlzLmdldFZsRmlsdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmxGaWx0ZXIgPSBfLnJlZHVjZShzZWxmLmZpbHRlckluZGV4LCBmdW5jdGlvbiAoZmlsdGVycywgZmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IGZpbHRlci5maWVsZDtcbiAgICAgICAgdmFyIHRpbWVVbml0ID0gZmlsdGVyLnRpbWVVbml0O1xuXG4gICAgICAgIGlmIChmaWx0ZXIuaW4pIHtcbiAgICAgICAgICBpZiAoIGZpbHRlci5pbi5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgICAgICAgIGZpbHRlci5pbi5sZW5ndGggPT09IERhdGFzZXQuc2NoZW1hLmNhcmRpbmFsaXR5KHtmaWVsZDogZmllbGR9KSApIHtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXIucmFuZ2UpIHtcbiAgICAgICAgICB2YXIgZG9tYWluID0gRGF0YXNldC5zY2hlbWEuZG9tYWluKHtcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIHRpbWVVbml0OiB0aW1lVW5pdFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGZpbHRlci5yYW5nZVswXSA9PT0gZG9tYWluWzBdICYmIGZpbHRlci5yYW5nZVsxXSA9PT0gZG9tYWluWzFdKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVycztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmlsdGVyLmVuYWJsZWQpIHtcbiAgICAgICAgICBmaWx0ZXJzLnB1c2goXy5vbWl0KGZpbHRlciwgJ2VuYWJsZWQnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcnM7XG4gICAgICB9LCBbXSk7XG5cbiAgICAgIHJldHVybiB2bEZpbHRlci5sZW5ndGggPyB2bEZpbHRlciA6IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdEZpbHRlcihmaWVsZCkge1xuICAgICAgdmFyIHR5cGUgPSBEYXRhc2V0LnNjaGVtYS50eXBlKGZpZWxkKTtcblxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgdmwudHlwZS5OT01JTkFMOlxuICAgICAgICBjYXNlIHZsLnR5cGUuT1JESU5BTDpcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIGluOiBEYXRhc2V0LnNjaGVtYS5kb21haW4oe2ZpZWxkOiBmaWVsZH0pXG4gICAgICAgICAgfTtcbiAgICAgICAgY2FzZSB2bC50eXBlLlFVQU5USVRBVElWRTpcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIHJhbmdlOiBbXG4gICAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnN0YXRzKHtmaWVsZDogZmllbGR9KS5taW4sXG4gICAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnN0YXRzKHtmaWVsZDogZmllbGR9KS5tYXhcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9O1xuICAgICAgICBjYXNlIHZsLnR5cGUuVEVNUE9SQUw6XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgICByYW5nZTogW1xuICAgICAgICAgICAgICBEYXRhc2V0LnNjaGVtYS5zdGF0cyh7ZmllbGQ6IGZpZWxkfSkubWluLFxuICAgICAgICAgICAgICBEYXRhc2V0LnNjaGVtYS5zdGF0cyh7ZmllbGQ6IGZpZWxkfSkubWF4XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csICR3ZWJTcWwsIF8sIGNvbnN0cywgQW5hbHl0aWNzLCBQYXBhLCBCbG9iLCBVUkwpIHtcblxuICAgIHZhciBzZXJ2aWNlID0ge307XG5cbiAgICBzZXJ2aWNlLmxldmVscyA9IHtcbiAgICAgIE9GRjoge2lkOidPRkYnLCByYW5rOjB9LFxuICAgICAgVFJBQ0U6IHtpZDonVFJBQ0UnLCByYW5rOjF9LFxuICAgICAgREVCVUc6IHtpZDonREVCVUcnLCByYW5rOjJ9LFxuICAgICAgSU5GTzoge2lkOidJTkZPJywgcmFuazozfSxcbiAgICAgIFdBUk46IHtpZDonV0FSTicsIHJhbms6NH0sXG4gICAgICBFUlJPUjoge2lkOidFUlJPUicsIHJhbms6NX0sXG4gICAgICBGQVRBTDoge2lkOidGQVRBTCcsIHJhbms6Nn1cbiAgICB9O1xuXG4gICAgc2VydmljZS5hY3Rpb25zID0ge1xuICAgICAgLy8gREFUQVxuICAgICAgSU5JVElBTElaRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnSU5JVElBTElaRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBVTkRPOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdVTkRPJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnUkVETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfT1BFTjoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfUEFTVEU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfTkVXX1BBU1RFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfVVJMOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19VUkwnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICAvLyBCT09LTUFSS1xuICAgICAgQk9PS01BUktfQUREOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19BREQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19SRU1PVkU6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX1JFTU9WRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX09QRU46IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTE9TRToge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTEVBUjoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDogJ0JPT0tNQVJLX0NMRUFSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQ0hBUlRcbiAgICAgIENIQVJUX01PVVNFT1ZFUjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVkVSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX01PVVNFT1VUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9NT1VTRU9VVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9SRU5ERVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1JFTkRFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9FWFBPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX0VYUE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9UT09MVElQJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1RPT0xUSVBfRU5EOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9UT09MVElQX0VORCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG5cbiAgICAgIFNPUlRfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidTT1JUX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE1BUktfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidNQVJLX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fT1BFTjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonRFJJTExfRE9XTl9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRFJJTExfRE9XTl9DTE9TRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0RSSUxMX0RPV05fQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0dfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnTE9HX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFRSQU5TUE9TRV9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdUUkFOU1BPU0VfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTlVMTF9GSUxURVJfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidOVUxMX0ZJTFRFUl9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIENMVVNURVJfU0VMRUNUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDTFVTVEVSX1NFTEVDVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIExPQURfTU9SRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTE9BRF9NT1JFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGSUVMRFNcbiAgICAgIEZJRUxEU19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEU19SRVNFVDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGSUVMRFNfUkVTRVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGVU5DX0NIQU5HRToge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGVU5DX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEFERF9GSUVMRDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdBRERfRklFTEQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEZpZWxkIEluZm9cbiAgICAgIEZJRUxEREVGX0hJR0hMSUdIVEVEOiB7Y2F0ZWdvcnk6ICdGSUVMRElORk8nLCBpZDogJ0ZJRUxEREVGX0hJR0hMSUdIVEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERERUZfVU5ISUdITElHSFRFRDoge2NhdGVnb3J5OiAnRklFTERJTkZPJywgaWQ6ICdGSUVMRERFRl9VTkhJR0hMSUdIVEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBXSUxEQ0FSRFxuICAgICAgQUREX1dJTERDQVJEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnQUREX1dJTERDQVJEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQUREX1dJTERDQVJEX0ZJRUxEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnQUREX1dJTERDQVJEX0ZJRUxEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVNT1ZFX1dJTERDQVJEX0ZJRUxEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnUkVNT1ZFX1dJTERDQVJEX0ZJRUxEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVNT1ZFX1dJTERDQVJEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnUkVNT1ZFX1dJTERDQVJEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBQT0xFU1RBUlxuICAgICAgU1BFQ19DTEVBTjoge2NhdGVnb3J5OidQT0xFU1RBUicsIGlkOiAnU1BFQ19DTEVBTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEX0RST1A6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdGSUVMRF9EUk9QJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERfUkVNT1ZFRDoge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ0ZJRUxEX1JFTU9WRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGaWx0ZXJcbiAgICAgIEZJTFRFUl9FTkFCTEVEOiB7Y2F0ZWdvcnk6J0ZJTFRFUicsIGlkOiAnRklMVEVSX0VOQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUxURVJfRElTQUJMRUQ6IHtjYXRlZ29yeTonRklMVEVSJywgaWQ6ICdGSUxURVJfRElTQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUxURVJfQ0hBTkdFOiB7Y2F0ZWdvcnk6J0ZJTFRFUicsIGlkOiAnRklMVEVSX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJTFRFUl9DTEVBUjoge2NhdGVnb3J5OidGSUxURVInLCBpZDogJ0ZJTFRFUl9DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gVm95YWdlciAyXG4gICAgICBTUEVDX1NFTEVDVDoge2NhdGVnb3J5OidWT1lBR0VSMicsIGlkOiAnU1BFQ19TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEFsdGVybmF0aXZlc1xuICAgICAgU0VUX0FMVEVSTkFUSVZFU19UWVBFOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnU0VUX0FMVEVSTkFUSVZFU19UWVBFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVE9HR0xFX1NIT1dfQUxURVJOQVRJVkVTOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnVE9HR0xFX1NIT1dfQUxURVJOQVRJVkVTJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVE9HR0xFX0hJREVfQUxURVJOQVRJVkVTOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnVE9HR0xFX0hJREVfQUxURVJOQVRJVkVTJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBQcmV2aWV3XG4gICAgICBTUEVDX1BSRVZJRVdfRU5BQkxFRDoge2NhdGVnb3J5OidQUkVWSUVXJywgaWQ6ICdTUEVDX1BSRVZJRVdfRU5BQkxFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfUFJFVklFV19ESVNBQkxFRDoge2NhdGVnb3J5OidQUkVWSUVXJywgaWQ6ICdTUEVDX1BSRVZJRVdfRElTQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT31cbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlIG5vb3Agc2VydmljZSBpZiB3ZWJzcWwgaXMgbm90IHN1cHBvcnRlZFxuICAgIGlmICgkd2luZG93Lm9wZW5EYXRhYmFzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIHdlYnNxbCBzdXBwb3J0IGFuZCB0aHVzIG5vIGxvZ2dpbmcuJyk7XG4gICAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgIHJldHVybiBzZXJ2aWNlO1xuICAgIH1cblxuICAgIC8vIGdldCB1c2VyIGlkIG9uY2UgaW4gdGhlIGJlZ2lubmluZ1xuICAgIHZhciB1c2VyaWQgPSBzZXJ2aWNlLnVzZXJpZCA9ICRsb2NhdGlvbi5zZWFyY2goKS51c2VyaWQ7XG5cbiAgICBzZXJ2aWNlLmRiID0gJHdlYlNxbC5vcGVuRGF0YWJhc2UoJ2xvZ3MnLCAnMS4wJywgJ0xvZ3MnLCAyICogMTAyNCAqIDEwMjQpO1xuXG4gICAgc2VydmljZS50YWJsZU5hbWUgPSAnTG9nc18nICsgY29uc3RzLmFwcElkO1xuXG4gICAgLy8gKHplbmluZykgVE9ETzogY2hlY2sgaWYgdGhlIHRhYmxlIGlzIGNvcnJlY3QsIGRvIHdlIHJlYWxseSBuZWVkIHRpbWU/IHdpbGwgdGltZSBiZSBhdXRvbWF0aWNhbGx5IGFkZGVkP1xuICAgIHNlcnZpY2UuY3JlYXRlVGFibGVJZk5vdEV4aXN0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgc2VydmljZS5kYi5jcmVhdGVUYWJsZShzZXJ2aWNlLnRhYmxlTmFtZSwge1xuICAgICAgICAndXNlcmlkJzoge1xuICAgICAgICAgICd0eXBlJzogJ0lOVEVHRVInLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAndGltZSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdUSU1FU1RBTVAnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnYWN0aW9uQ2F0ZWdvcnknOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVEVYVCcsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICdhY3Rpb25JZCc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ2xhYmVsJzoge1xuICAgICAgICAgICd0eXBlJzogJ1RFWFQnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnZGF0YSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgc2VydmljZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHIgPSAkd2luZG93LmNvbmZpcm0oJ1JlYWxseSBjbGVhciB0aGUgbG9ncz8nKTtcbiAgICAgIGlmIChyID09PSB0cnVlKSB7XG4gICAgICAgIHNlcnZpY2UuZGIuZHJvcFRhYmxlKHNlcnZpY2UudGFibGVOYW1lKTtcbiAgICAgICAgc2VydmljZS5jcmVhdGVUYWJsZUlmTm90RXhpc3RzKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuZXhwb3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICBzZXJ2aWNlLmRiLnNlbGVjdEFsbChzZXJ2aWNlLnRhYmxlTmFtZSkudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIGlmIChyZXN1bHRzLnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdObyBsb2dzJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJvd3MgPSBbXTtcblxuICAgICAgICBmb3IodmFyIGk9MDsgaSA8IHJlc3VsdHMucm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHJvd3MucHVzaChyZXN1bHRzLnJvd3MuaXRlbShpKSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY3N2ID0gUGFwYS51bnBhcnNlKHJvd3MpO1xuXG4gICAgICAgIHZhciBjc3ZEYXRhID0gbmV3IEJsb2IoW2Nzdl0sIHsgdHlwZTogJ3RleHQvY3N2JyB9KTtcbiAgICAgICAgdmFyIGNzdlVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoY3N2RGF0YSk7XG5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoJzxhLz4nKTtcbiAgICAgICAgZWxlbWVudC5hdHRyKHtcbiAgICAgICAgICBocmVmOiBjc3ZVcmwsXG4gICAgICAgICAgdGFyZ2V0OiAnX2JsYW5rJyxcbiAgICAgICAgICBkb3dubG9hZDogc2VydmljZS50YWJsZU5hbWUgKyAnXycgKyB1c2VyaWQgKyAnXycgKyBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgKyAnLmNzdidcbiAgICAgICAgfSlbMF0uY2xpY2soKTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24sIGxhYmVsLCBkYXRhKSB7XG4gICAgICBpZiAoIWNvbnN0cy5sb2dnaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciB2YWx1ZSA9IGRhdGEgPyBkYXRhLnZhbHVlIDogdW5kZWZpbmVkO1xuICAgICAgaWYoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHNbY29uc3RzLmxvZ0xldmVsIHx8ICdJTkZPJ10ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcblxuICAgICAgICBpZiAoY29uc3RzLmxvZ1RvV2ViU3FsKSB7XG4gICAgICAgICAgdmFyIHJvdyA9IHtcbiAgICAgICAgICAgIHVzZXJpZDogdXNlcmlkLFxuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgYWN0aW9uQ2F0ZWdvcnk6IGFjdGlvbi5jYXRlZ29yeSxcbiAgICAgICAgICAgIGFjdGlvbklkOiBhY3Rpb24uaWQsXG4gICAgICAgICAgICBsYWJlbDogXy5pc09iamVjdChsYWJlbCkgPyBKU09OLnN0cmluZ2lmeShsYWJlbCkgOiBsYWJlbCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6IHVuZGVmaW5lZFxuICAgICAgICAgIH07XG4gICAgICAgICAgc2VydmljZS5kYi5pbnNlcnQoc2VydmljZS50YWJsZU5hbWUsIHJvdyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHNbY29uc3RzLmxvZ1ByaW50TGV2ZWwgfHwgJ0lORk8nXS5yYW5rKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmNyZWF0ZVRhYmxlSWZOb3RFeGlzdHMoKTtcbiAgICBjb25zb2xlLmxvZygnYXBwOicsIGNvbnN0cy5hcHBJZCwgJ3N0YXJ0ZWQnKTtcbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uKHNlcnZpY2UuYWN0aW9ucy5JTklUSUFMSVpFLCBjb25zdHMuYXBwSWQpO1xuXG4gICAgcmV0dXJuIHNlcnZpY2U7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdQaWxscycsIGZ1bmN0aW9uIChBTlksIGNvbnN0cywgdXRpbCwgdmwsIGNxbCkge1xuICAgIHZhciBQaWxscyA9IHtcbiAgICAgIC8vIEZ1bmN0aW9uc1xuICAgICAgaXNBbnlDaGFubmVsOiBpc0FueUNoYW5uZWwsXG4gICAgICBnZXROZXh0QW55Q2hhbm5lbElkOiBnZXROZXh0QW55Q2hhbm5lbElkLFxuICAgICAgZ2V0RW1wdHlBbnlDaGFubmVsSWQ6IGdldEVtcHR5QW55Q2hhbm5lbElkLFxuICAgICAgaXNFbnVtZXJhdGVkQ2hhbm5lbDogaXNFbnVtZXJhdGVkQ2hhbm5lbCxcbiAgICAgIGlzRW51bWVyYXRlZEZpZWxkOiBpc0VudW1lcmF0ZWRGaWVsZCxcblxuICAgICAgZ2V0OiBnZXQsXG4gICAgICAvLyBFdmVudFxuICAgICAgZHJhZ0Ryb3A6IGRyYWdEcm9wLFxuICAgICAgZHJhZ1N0YXJ0OiBkcmFnU3RhcnQsXG4gICAgICBkcmFnU3RvcDogZHJhZ1N0b3AsXG4gICAgICAvLyBFdmVudCwgd2l0aCBoYW5kbGVyIGluIHRoZSBsaXN0ZW5lclxuXG4gICAgICAvKiogU2V0IGEgZmllbGREZWYgZm9yIGEgY2hhbm5lbCAqL1xuICAgICAgc2V0OiBzZXQsXG5cbiAgICAgIC8qKiBSZW1vdmUgYSBmaWVsZERlZiBmcm9tIGEgY2hhbm5lbCAqL1xuICAgICAgcmVtb3ZlOiByZW1vdmUsXG5cbiAgICAgIGNvdW50RmllbGREZWY6IHtmaWVsZDogJyonLCBhZ2dyZWdhdGU6IHZsLmFnZ3JlZ2F0ZS5BZ2dyZWdhdGVPcC5DT1VOVCwgdHlwZTogdmwudHlwZS5RVUFOVElUQVRJVkV9LFxuXG4gICAgICAvLyBEYXRhXG4gICAgICAvLyBUT0RPOiBzcGxpdCBiZXR3ZWVuIGVuY29kaW5nIHJlbGF0ZWQgYW5kIG5vbi1lbmNvZGluZyByZWxhdGVkXG4gICAgICBwaWxsczoge30sXG4gICAgICBoaWdobGlnaHRlZDoge30sXG4gICAgICAvKiogcGlsbCBiZWluZyBkcmFnZ2VkICovXG4gICAgICBkcmFnZ2luZzogbnVsbCxcbiAgICAgIGlzRHJhZ2dpbmdXaWxkY2FyZDogbnVsbCxcbiAgICAgIC8qKiBjaGFubmVsSWQgdGhhdCdzIHRoZSBwaWxsIGlzIGJlaW5nIGRyYWdnZWQgZnJvbSAqL1xuICAgICAgY2lkRHJhZ0Zyb206IG51bGwsXG4gICAgICAvKiogTGlzdGVuZXIgICovXG4gICAgICBsaXN0ZW5lcjogbnVsbFxuICAgIH07XG5cbiAgICAvLyBBZGQgbGlzdGVuZXIgdHlwZSB0aGF0IFBpbGxzIGp1c3QgcGFzcyBhcmd1bWVudHMgdG8gaXRzIGxpc3RlbmVyXG4gICAgLy8gRklYTUU6IHByb3Blcmx5IGltcGxlbWVudCBsaXN0ZW5lciBwYXR0ZXJuXG4gICAgW1xuICAgICAgJ2FkZCcsICdwYXJzZScsICdzZWxlY3QnLCAncHJldmlldycsICd1cGRhdGUnLCAncmVzZXQnLFxuICAgICAgJ3Jlc2NhbGUnLCAnc29ydCcsICd0b2dnbGVGaWx0ZXJJbnZhbGlkJywgJ3RyYW5zcG9zZScsXG4gICAgICAnYWRkV2lsZGNhcmRGaWVsZCcsICdhZGRXaWxkY2FyZCcsICdyZW1vdmVXaWxkY2FyZEZpZWxkJywgJ3JlbW92ZVdpbGRjYXJkJ1xuICAgIF0uZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lclR5cGUpIHtcbiAgICAgIFBpbGxzW2xpc3RlbmVyVHlwZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyW2xpc3RlbmVyVHlwZV0pIHtcbiAgICAgICAgICByZXR1cm4gUGlsbHMubGlzdGVuZXJbbGlzdGVuZXJUeXBlXS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBjaGFubmVsIGlkIGlzIGFuIFwiYW55XCIgY2hhbm5lbFxuICAgICAqXG4gICAgICogQHBhcmFtIHthbnl9IGNoYW5uZWxJZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQW55Q2hhbm5lbChjaGFubmVsSWQpIHtcbiAgICAgIHJldHVybiBjaGFubmVsSWQgJiYgY2hhbm5lbElkLmluZGV4T2YoQU5ZKSA9PT0gMDsgLy8gcHJlZml4IGJ5IEFOWVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEVtcHR5QW55Q2hhbm5lbElkKCkge1xuICAgICAgdmFyIGFueUNoYW5uZWxzID0gdXRpbC5rZXlzKFBpbGxzLnBpbGxzKS5maWx0ZXIoZnVuY3Rpb24oY2hhbm5lbElkKSB7XG4gICAgICAgIHJldHVybiBjaGFubmVsSWQuaW5kZXhPZihBTlkpID09PSAwO1xuICAgICAgfSk7XG4gICAgICBmb3IgKHZhciBpPTAgOyBpIDwgYW55Q2hhbm5lbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoYW5uZWxJZCA9IGFueUNoYW5uZWxzW2ldO1xuICAgICAgICBpZiAoIVBpbGxzLnBpbGxzW2NoYW5uZWxJZF0uZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gY2hhbm5lbElkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVtcHR5IGFueSBjaGFubmVsIGF2YWlsYWJsZSEnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXh0QW55Q2hhbm5lbElkKCkge1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgd2hpbGUgKFBpbGxzLnBpbGxzW0FOWSArIGldKSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cblxuICAgICAgaWYgKCFjb25zdHMubWF4QW55U2hlbGYgfHwgaSA+PSBjb25zdHMubWF4QW55U2hlbGYpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBBTlkgKyBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCBhIGZpZWxkRGVmIG9mIGEgcGlsbCBvZiBhIGdpdmVuIGNoYW5uZWxJZFxuICAgICAqIEBwYXJhbSBjaGFubmVsSWQgY2hhbm5lbCBpZCBvZiB0aGUgcGlsbCB0byBiZSB1cGRhdGVkXG4gICAgICogQHBhcmFtIGZpZWxkRGVmIGZpZWxkRGVmIHRvIHRvIGJlIHVwZGF0ZWRcbiAgICAgKiBAcGFyYW0gdXBkYXRlIHdoZXRoZXIgdG8gcHJvcGFnYXRlIGNoYW5nZSB0byB0aGUgY2hhbm5lbCB1cGRhdGUgbGlzdGVuZXJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXQoY2hhbm5lbElkLCBmaWVsZERlZiwgdXBkYXRlKSB7XG4gICAgICBQaWxscy5waWxsc1tjaGFubmVsSWRdID0gZmllbGREZWY7XG5cbiAgICAgIGlmICh1cGRhdGUgJiYgUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIuc2V0KGNoYW5uZWxJZCwgZmllbGREZWYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhIGZpZWxkRGVmIG9mIGEgcGlsbCBvZiBhIGdpdmVuIGNoYW5uZWxJZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldChjaGFubmVsSWQpIHtcbiAgICAgIHJldHVybiBQaWxscy5waWxsc1tjaGFubmVsSWRdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRW51bWVyYXRlZENoYW5uZWwoY2hhbm5lbElkKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkQ2hhbm5lbCkge1xuICAgICAgICByZXR1cm4gUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkQ2hhbm5lbChjaGFubmVsSWQsIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRW51bWVyYXRlZEZpZWxkKGNoYW5uZWxJZCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLmlzRW51bWVyYXRlZEZpZWxkKSB7XG4gICAgICAgIHJldHVybiBQaWxscy5saXN0ZW5lci5pc0VudW1lcmF0ZWRGaWVsZChjaGFubmVsSWQsIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZShjaGFubmVsSWQpIHtcbiAgICAgIGRlbGV0ZSBQaWxscy5waWxsc1tjaGFubmVsSWRdO1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnJlbW92ZShjaGFubmVsSWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW55fSBwaWxsIHBpbGwgYmVpbmcgZHJhZ2dlZFxuICAgICAqIEBwYXJhbSB7YW55fSBjaWREcmFnRnJvbSBjaGFubmVsIGlkIHRoYXQgdGhlIHBpbGwgaXMgZHJhZ2dlZCBmcm9tXG4gICAgICovXG4gICAgZnVuY3Rpb24gZHJhZ1N0YXJ0KHBpbGwsIGNpZERyYWdGcm9tKSB7XG4gICAgICBQaWxscy5kcmFnZ2luZyA9IHBpbGw7XG4gICAgICBQaWxscy5pc0RyYWdnaW5nV2lsZGNhcmQgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLmZpZWxkKTtcbiAgICAgIFBpbGxzLmNpZERyYWdGcm9tID0gY2lkRHJhZ0Zyb207XG4gICAgfVxuXG4gICAgLyoqIFN0b3AgcGlsbCBkcmFnZ2luZyAqL1xuICAgIGZ1bmN0aW9uIGRyYWdTdG9wKCkge1xuICAgICAgUGlsbHMuZHJhZ2dpbmcgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdoZW4gYSBwaWxsIGlzIGRyb3BwZWRcbiAgICAgKiBAcGFyYW0gY2lkRHJhZ1RvICBjaGFubmVsSWQgdGhhdCdzIHRoZSBwaWxsIGlzIGJlaW5nIGRyYWdnZWQgdG9cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkcmFnRHJvcChjaWREcmFnVG8pIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5kcmFnRHJvcChjaWREcmFnVG8sIFBpbGxzLmNpZERyYWdGcm9tKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUGlsbHM7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZXJ2aWNlIGZvciBzZXJ2aW5nIFZMIFNjaGVtYVxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnU2NoZW1hJywgZnVuY3Rpb24odmcsIHZsLCB2bFNjaGVtYSkge1xuICAgIHZhciBTY2hlbWEgPSB7fTtcblxuICAgIFNjaGVtYS5zY2hlbWEgPSB2bFNjaGVtYTtcblxuICAgIFNjaGVtYS5nZXRDaGFubmVsU2NoZW1hID0gZnVuY3Rpb24oY2hhbm5lbCkge1xuICAgICAgdmFyIGRlZiA9IG51bGw7XG4gICAgICB2YXIgZW5jb2RpbmdDaGFubmVsUHJvcCA9IFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnMuRW5jb2RpbmcucHJvcGVydGllc1tjaGFubmVsXTtcbiAgICAgIC8vIGZvciBkZXRhaWwsIGp1c3QgZ2V0IHRoZSBmbGF0IHZlcnNpb25cbiAgICAgIHZhciByZWYgPSBlbmNvZGluZ0NoYW5uZWxQcm9wID9cbiAgICAgICAgKGVuY29kaW5nQ2hhbm5lbFByb3AuJHJlZiB8fCBlbmNvZGluZ0NoYW5uZWxQcm9wLm9uZU9mWzBdLiRyZWYpIDpcbiAgICAgICAgJ0ZpZWxkRGVmJzsgLy8ganVzdCB1c2UgdGhlIGdlbmVyaWMgdmVyc2lvbiBmb3IgQU5ZIGNoYW5uZWxcbiAgICAgIGRlZiA9IHJlZi5zbGljZShyZWYubGFzdEluZGV4T2YoJy8nKSsxKTtcbiAgICAgIHJldHVybiBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zW2RlZl07XG4gICAgfTtcblxuICAgIHJldHVybiBTY2hlbWE7XG4gIH0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
